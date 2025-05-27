import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import pdfParse from 'pdf-parse';

// Import the position extraction and generation functions
import { extractTextWithPositions, findClausePositionsInText } from '../../lib/pdf'; // Adjust path if needed

// --- Remove DB Imports for getDocumentById --- 
// (Keep saveKeyPoints, saveClauses if needed for saving results later)
import {
  saveKeyPoints, 
  saveClauses   
} from '../../lib/db'; // Adjust path if necessary

// Initialize OpenAI client v4+
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to map label to severity score
function labelToSeverity(label?: string): number {
  switch (label) {
    case 'favorable': return 0.25;
    case 'unfavorable': return 0.75;
    case 'harsh': return 1.0;
    case 'standard provision': return 0.5;
    default: return 0.5; // Default/neutral
  }
}

// Helper function to strip markdown code blocks from JSON
function stripMarkdown(text: string): string {
  // Check if response is wrapped in markdown code blocks
  if (text.startsWith('```')) {
    // Extract content between markdown code blocks
    const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return text;
}

// Function to extract text from a PDF Buffer using pdf-parse
/*
async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("Error extracting text from PDF buffer:", error);
    return "Error extracting text from the document buffer.";
  }
}
*/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- Expect filename, content, AND fileId directly in the body ---
    const { fileName, fileContentBase64, fileId } = req.body;

    // fileId is no longer expected in the request, it will be generated
    if (!fileContentBase64) {
        return res.status(400).json({ error: 'Missing file content in request body (fileContentBase64)' });
    }
    if (!fileId || typeof fileId !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid fileId in request body' });
    }
    console.log(`Processing request for fileId: ${fileId}, fileName: ${fileName || 'N/A'}`);

    // --- Decode base64 content to Buffer ---
    let pdfBuffer: Buffer;
    try {
        pdfBuffer = Buffer.from(fileContentBase64, 'base64');
        console.log(`Successfully decoded base64 content for fileId: ${fileId}. Buffer length: ${pdfBuffer.length}`);
    } catch (decodeError) {
        console.error("Error decoding base64 content:", decodeError);
        return res.status(400).json({ error: 'Invalid base64 file content provided.' });
    }

    // --- Remove DB lookup and Filesystem lookup ---

    // Extract text using pdfjs-dist (extractTextWithPositions)
    console.log("Extracting text and positions with pdfjs-dist...");
    let textItems: any[];
    try {
      // Convert Node.js Buffer to ArrayBuffer correctly
      // Create a Uint8Array view of the buffer, then get its underlying ArrayBuffer
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdfArrayBuffer = uint8Array.buffer;
      textItems = await extractTextWithPositions(pdfArrayBuffer);
      console.log(`Extracted ${textItems.length} text items with positions.`);
    } catch (extractError) {
      console.error("pdfjs-dist failed to extract text/positions:", extractError);
      const errorMessage = extractError instanceof Error ? extractError.message : 'Unknown extraction error';
      return res.status(500).json({ error: `Error extracting text/positions: ${errorMessage}` });
    }

    // Reconstruct full text from text items for AI analysis, adding page markers
    let reconstructedTextWithPages = '';
    let currentPage = 0;
    textItems.forEach(item => {
      if (item.page !== currentPage) {
        currentPage = item.page;
        reconstructedTextWithPages += `\n\n--- Page ${currentPage} ---\n\n`;
      }
      reconstructedTextWithPages += item.text + ' '; // Add space between items on same page
    });

    const extractedText = reconstructedTextWithPages.trim(); // Use this for response
    console.log(`Reconstructed text length for AI: ${extractedText.length}`);

    // Check if extraction yielded any text
    if (!extractedText || extractedText.trim().length === 0) {
        console.error("Extraction yielded no text content.");
        // Optionally return a specific error or proceed with empty text
        // For now, proceed, OpenAI calls might handle empty input gracefully or fail
    }

    // Use the reconstructed text for analysis
    const textToAnalyze = extractedText;
    console.log(`Using reconstructed text for analysis (length ${textToAnalyze.length})`);

    // --- Keep OpenAI calls and response formatting as before ---
    // (Summary, Key Points, Clause generation, Benchmarks - using textToAnalyze)
    
    // Generate a summary using OpenAI
    let summary;
    try {
      const summaryCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that summarizes legal text concisely." },
          { role: "user", content: `Provide a brief but overall summary (3-5 sentences) of the following contract text: ${textToAnalyze}` }
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
          { role: "user", content: `List 5 of the most important key points from the following contract. Return a JSON array of strings without any markdown formatting: ${textToAnalyze}` }
        ],
      });
      
      const keyPointsText = keyPointsCompletion.choices[0]?.message?.content?.trim() || "[]";
      const cleanedKeyPointsText = stripMarkdown(keyPointsText);
      keyPoints = JSON.parse(cleanedKeyPointsText);
    } catch (error) {
      console.error("Error generating key points:", error);
      keyPoints = [];
    }
    
    // --- Per-Page Clause Extraction --- 
    let allParsedClauses: any[] = [];

    // 1. Split the text by page markers
    const pageTexts = textToAnalyze.split(/\n\n--- Page \d+ ---\n\n/);
    // pageTexts[0] might be empty if the text starts with a marker, handle this later if needed

    console.log(`Split text into ${pageTexts.length} potential page chunks.`);

    // 2. Loop through each page's text (adjusting index for page number)
    for (let pageIndex = 0; pageIndex < pageTexts.length; pageIndex++) {
      const currentPageNumber = pageIndex + 1; // Assuming pages start from 1
      const pageText = pageTexts[pageIndex]?.trim();

      if (!pageText) {
        console.log(`Skipping empty text for page index ${pageIndex} (Page ${currentPageNumber})`);
        continue; // Skip empty pages
      }

      console.log(`Processing Page ${currentPageNumber} for clauses... (Text length: ${pageText.length})`);

      // 3. Simplified prompt for this specific page
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

          // 4. Add the known page number and default label to each clause from this page
          const clausesForThisPage = parsedPageClauses.map((c: any) => ({
            ...c,
            pageNumber: currentPageNumber, // Assign the correct page number from the loop
            label: c.label || 'standard provision',
            explanation: c.explanation || '' // Include explanation, default to empty string
          }));

          allParsedClauses.push(...clausesForThisPage); // Aggregate results
          console.log(`Successfully parsed ${clausesForThisPage.length} clauses for Page ${currentPageNumber}.`);

        } catch (parseError) {
          console.error(`Failed to parse AI-generated clauses for Page ${currentPageNumber}:`, parseError, "Raw text:", pageClausesText);
        }
      } catch (apiError) {
        console.error(`Failed to generate clauses with OpenAI for Page ${currentPageNumber}:`, apiError);
      }
    }
    console.log(`Total clauses aggregated from all pages: ${allParsedClauses.length}`);

    // Use the aggregated clauses for position finding
    const parsedClausesFromAI = allParsedClauses; 

    // --- Map AI clauses to actual positions using textItems ---
    // Iterate through AI clauses, find positions, but prioritize AI page number
    const clausesWithActualPositions = parsedClausesFromAI.map((aiClause, index) => {
        let bestPosition = null;
        let positionPage = aiClause.pageNumber || 1; // Default to AI page initially

        if (textItems.length > 0 && aiClause.text) {
            try {
                // Pass the expected page number to restrict the search
                const potentialPositions = findClausePositionsInText(textItems, aiClause.text, aiClause.pageNumber);
                if (potentialPositions.length > 0) {
                    const bestMatch = potentialPositions[0]; // findClausePositionsInText sorts by quality
                    positionPage = bestMatch.page; // bestMatch.page should equal aiClause.pageNumber
                    bestPosition = {
                        top: bestMatch.top,
                        left: bestMatch.left,
                        width: bestMatch.width,
                        height: bestMatch.height,
                    };
                    console.log(`Found position for AI clause index ${index} on page ${positionPage}. (AI guessed: ${aiClause.pageNumber})`);
                } else {
                    console.warn(`Could not find text match/position for AI clause index ${index}: ${aiClause.text?.substring(0, 50)}...`);
                }
            } catch (findPosError) {
                console.error(`Error in findClausePositionsInText for AI clause index ${index}:`, findPosError);
            }
        }

        return {
            ...aiClause,
            id: randomUUID(), // Assign final unique ID
            page: positionPage, // Use AI's determined page number (or default)
            position: bestPosition || { top: 0, left: 0, width: 0, height: 0 }, // Use found position or default
            label: aiClause.label || 'standard provision' // Ensure default label
        };
    });

    console.log(`Processed ${clausesWithActualPositions.length} clauses. Found positions for ${clausesWithActualPositions.filter(c => c.position && c.position.width > 0).length}.`);

    // Add benchmark percentiles to clauses that now have positions
    const clausesWithBenchmarks = clausesWithActualPositions.map((clause: any) => {
      const severity = labelToSeverity(clause.label);
      const percentile = clause.label === 'favorable' ? 25 
                       : clause.label === 'unfavorable' ? 75 
                       : clause.label === 'harsh' ? 90 
                       : 50; // standard provision maps to 50
      return {
        ...clause,
        benchmark: {
          severity,
          percentile,
          tag: clause.tags?.[0] || '',
              comparison: percentile > 50 ? `Harsher than ${Math.round(percentile)}% of similar clauses` : `More favorable than ${Math.round(100 - percentile)}% of similar clauses` 
        }
      };
    });
    
    // --- Save results to localStorage format ---
    // The frontend processing page will poll localStorage for this key
    const resultsToStore = {
      fileId: fileId, // Use the received fileId
      summary: summary,
      keyPoints: keyPoints || [],
      highlightedClauses: clausesWithBenchmarks || [],
      fullText: extractedText || '',
      fileContentBase64: fileContentBase64 // Store the original base64 too
    };

    // Although we can't directly manipulate browser localStorage from the API,
    // we structure the response so the frontend knows what to store.
    // We will save it on the frontend *after* the API call is initiated.
    // For now, just send back the necessary data for the frontend to store.
    console.log(`API processing complete for ${fileId}. Sending results back.`);

    // Send back the results (the frontend upload logic will handle storing it)
    res.status(200).json(resultsToStore); 

  } catch (error) {
    console.error('Extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: `Extraction failed: ${errorMessage}` });
  }
} 