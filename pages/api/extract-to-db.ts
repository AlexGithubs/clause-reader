import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { extractTextWithPositions, findClausePositionsInText } from '@/lib/pdf';
import { updateDocumentStatus, saveClausesToDocument, getDocumentById } from '@/lib/supabase-db';
import { getSupabaseAdmin } from '@/lib/supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to map label to score (0-100 scale)
function labelToScore(label?: string): number {
  switch (label) {
    case 'favorable': return 75; // 75-100 range
    case 'standard provision': return 50; // 40-60 range
    case 'unfavorable': return 25; // 20-40 range
    case 'harsh': return 10; // 0-20 range
    default: return 50; // Default to standard
  }
}

// Helper function to map score to label for display
function scoreToLabel(score: number): string {
  if (score >= 70) return 'favorable';
  if (score >= 40) return 'standard provision';
  if (score >= 20) return 'unfavorable';
  return 'harsh';
}

// Helper function to strip markdown code blocks from JSON
function stripMarkdown(text: string): string {
  if (text.startsWith('```')) {
    const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return text;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentId, fileName, fileContentBase64 } = req.body;

    if (!documentId || !fileContentBase64) {
      return res.status(400).json({ 
        error: 'Missing required fields: documentId, fileContentBase64' 
      });
    }

    console.log(`Processing document: ${documentId}`);

    // Update document status to processing
    await updateDocumentStatus(documentId, 'processing');

    // Decode base64 content to Buffer
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = Buffer.from(fileContentBase64, 'base64');
      console.log(`Successfully decoded base64 content. Buffer length: ${pdfBuffer.length}`);
    } catch (decodeError) {
      console.error("Error decoding base64 content:", decodeError);
      await updateDocumentStatus(documentId, 'error');
      return res.status(400).json({ error: 'Invalid base64 file content provided.' });
    }

    // Extract text using pdfjs-dist
    console.log("Extracting text and positions with pdfjs-dist...");
    let textItems: any[];
    try {
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdfArrayBuffer = uint8Array.buffer;
      textItems = await extractTextWithPositions(pdfArrayBuffer);
      console.log(`Extracted ${textItems.length} text items with positions.`);
    } catch (extractError) {
      console.error("pdfjs-dist failed to extract text/positions:", extractError);
      await updateDocumentStatus(documentId, 'error');
      const errorMessage = extractError instanceof Error ? extractError.message : 'Unknown extraction error';
      return res.status(500).json({ error: `Error extracting text/positions: ${errorMessage}` });
    }

    // Reconstruct full text from text items
    let reconstructedTextWithPages = '';
    let currentPage = 0;
    textItems.forEach(item => {
      if (item.page !== currentPage) {
        currentPage = item.page;
        reconstructedTextWithPages += `\n\n--- Page ${currentPage} ---\n\n`;
      }
      reconstructedTextWithPages += item.text + ' ';
    });

    const extractedText = reconstructedTextWithPages.trim();
    console.log(`Reconstructed text length for AI: ${extractedText.length}`);

    if (!extractedText || extractedText.trim().length === 0) {
      console.error("Extraction yielded no text content.");
      await updateDocumentStatus(documentId, 'error');
      return res.status(500).json({ error: 'No text content could be extracted from the PDF' });
    }

    // Generate summary using OpenAI
    let summary;
    try {
      const summaryCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that summarizes legal text concisely." },
          { role: "user", content: `Provide a brief but overall summary (3-5 sentences) of the following contract text: ${extractedText}` }
        ],
      });
      
      summary = summaryCompletion.choices[0]?.message?.content?.trim();
      if (!summary) {
        summary = "Unable to generate summary. Please try again with more contract text.";
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      summary = "Error generating summary. Please try again later.";
    }

    // Generate key points using OpenAI
    let keyPoints: string[] = [];
    try {
      const keyPointsCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that identifies key points in legal contracts." },
          { role: "user", content: `List 5 of the most important key points from the following contract. Return a JSON array of strings without any markdown formatting: ${extractedText}` }
        ],
      });
      
      const keyPointsText = keyPointsCompletion.choices[0]?.message?.content?.trim() || "[]";
      const cleanedKeyPointsText = stripMarkdown(keyPointsText);
      keyPoints = JSON.parse(cleanedKeyPointsText);
    } catch (error) {
      console.error("Error generating key points:", error);
      keyPoints = [];
    }

    // Extract clauses per page
    let allParsedClauses: any[] = [];
    const pageTexts = extractedText.split(/\n\n--- Page \d+ ---\n\n/);
    console.log(`Split text into ${pageTexts.length} potential page chunks.`);

    for (let pageIndex = 0; pageIndex < pageTexts.length; pageIndex++) {
      const currentPageNumber = pageIndex + 1;
      const pageText = pageTexts[pageIndex]?.trim();

      if (!pageText) {
        console.log(`Skipping empty text for page index ${pageIndex} (Page ${currentPageNumber})`);
        continue;
      }

      console.log(`Processing Page ${currentPageNumber} for clauses... (Text length: ${pageText.length})`);

      const perPagePrompt = `Extract important clauses from the following text (representing Page ${currentPageNumber}). For EACH clause, provide:
*   "text": The verbatim clause text.
*   "tags": A JSON array of relevant keyword tags.
*   "label": One of 'favorable', 'unfavorable', 'harsh', 'standard provision'.
*   "explanation": A brief (1 sentence) explanation of the clause's meaning or implication.
Format the output STRICTLY as a JSON array of these clause objects. Output ONLY the raw JSON array. Text:
${pageText}`;

      try {
        const pageClausesCompletion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: "You are a legal AI assistant focused on extracting clauses accurately from single-page text content." },
            { role: "user", content: perPagePrompt }
          ],
        });
        
        const pageClausesText = pageClausesCompletion.choices[0]?.message?.content?.trim() || "[]";
        console.log(`--- Raw OpenAI Response for Page ${currentPageNumber} Start ---`);
        console.log(pageClausesText);
        console.log(`--- Raw OpenAI Response for Page ${currentPageNumber} End ---`);

        try {
          const cleanedPageClausesText = stripMarkdown(pageClausesText);
          const parsedPageClauses = JSON.parse(cleanedPageClausesText);

          const clausesForThisPage = parsedPageClauses.map((c: any) => ({
            ...c,
            pageNumber: currentPageNumber,
            label: c.label || 'standard provision',
            explanation: c.explanation || ''
          }));

          allParsedClauses.push(...clausesForThisPage);
          console.log(`Successfully parsed ${clausesForThisPage.length} clauses for Page ${currentPageNumber}.`);

        } catch (parseError) {
          console.error(`Failed to parse AI-generated clauses for Page ${currentPageNumber}:`, parseError, "Raw text:", pageClausesText);
        }
      } catch (apiError) {
        console.error(`Failed to generate clauses with OpenAI for Page ${currentPageNumber}:`, apiError);
      }
    }

    console.log(`Total clauses aggregated from all pages: ${allParsedClauses.length}`);

    // Map AI clauses to actual positions and convert labels to scores
    const clausesWithActualPositions = allParsedClauses.map((aiClause, index) => {
      let bestPosition = null;
      let positionPage = aiClause.pageNumber || 1;

      if (textItems.length > 0 && aiClause.text) {
        try {
          const potentialPositions = findClausePositionsInText(textItems, aiClause.text, aiClause.pageNumber);
          if (potentialPositions.length > 0) {
            const bestMatch = potentialPositions[0];
            positionPage = bestMatch.page;
            bestPosition = {
              top: bestMatch.top,
              left: bestMatch.left,
              width: bestMatch.width,
              height: bestMatch.height,
            };
            console.log(`Found position for AI clause index ${index} on page ${positionPage}.`);
          } else {
            console.warn(`Could not find text match/position for AI clause index ${index}: ${aiClause.text?.substring(0, 50)}...`);
          }
        } catch (findPosError) {
          console.error(`Error in findClausePositionsInText for AI clause index ${index}:`, findPosError);
        }
      }

      // Convert label to score
      const score = labelToScore(aiClause.label);

      return {
        text: aiClause.text,
        page: positionPage,
        position: bestPosition || { top: 0, left: 0, width: 0, height: 0 },
        score: score, // Use score instead of label
        tags: aiClause.tags || [],
        explanation: aiClause.explanation || ''
      };
    });

    console.log(`Processed ${clausesWithActualPositions.length} clauses with scores.`);

    // Save clauses to database (using the score-based schema)
    await saveClausesToDocument(documentId, clausesWithActualPositions);
    console.log(`Saved ${clausesWithActualPositions.length} clauses to database`);

    // Update document with summary and full text, and set status to completed
    const { error: updateError } = await getSupabaseAdmin()
      .from('documents')
      .update({ 
        summary,
        full_text: extractedText,
        status: 'completed'
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    console.log(`Document updated with summary and status: ${documentId}`);

    // Save key points to a separate table if needed
    if (keyPoints.length > 0) {
      const keyPointsToSave = keyPoints.map(point => ({
        document_id: documentId,
        point_text: point
      }));

      const { error: keyPointsError } = await getSupabaseAdmin()
        .from('key_points')
        .insert(keyPointsToSave);

      if (keyPointsError) {
        console.error('Error saving key points:', keyPointsError);
        // Don't throw here, key points are not critical
      } else {
        console.log(`Saved ${keyPoints.length} key points to database`);
      }
    }

    console.log(`Document processing completed successfully: ${documentId}`);

    return res.status(200).json({
      success: true,
      documentId,
      summary,
      keyPointsCount: keyPoints.length,
      clausesCount: clausesWithActualPositions.length,
      message: 'Document processed successfully'
    });

  } catch (error) {
    console.error('Error in extract-to-db:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Try to update document status to error if we have a documentId
    if (req.body?.documentId) {
      try {
        await updateDocumentStatus(req.body.documentId, 'error');
      } catch (statusError) {
        console.error('Failed to update document status to error:', statusError);
      }
    }

    return res.status(500).json({ 
      error: 'Failed to process document',
      details: errorMessage
    });
  }
} 