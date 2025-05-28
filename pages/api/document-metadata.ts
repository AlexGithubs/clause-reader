import { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentById } from '@/lib/supabase-db';
import { getSupabaseAdmin } from '@/lib/supabase';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window === 'undefined') {
  // Server-side configuration
  const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid document ID' });
    }

    console.log(`Getting metadata for document: ${id}`);

    // Get document from database
    const document = await getDocumentById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.file_path) {
      return res.status(404).json({ error: 'PDF file not found for this document' });
    }

    // Download PDF from storage
    const { data, error } = await getSupabaseAdmin().storage
      .from('pdfs')
      .download(document.file_path);

    if (error || !data) {
      console.error('Error downloading PDF from storage:', error);
      return res.status(500).json({ error: 'Failed to retrieve PDF file' });
    }

    // Convert blob to buffer and then to Uint8Array
    const buffer = Buffer.from(await data.arrayBuffer());
    const uint8Array = new Uint8Array(buffer);

    // Load PDF document
    const pdfDocument = await pdfjs.getDocument({ data: uint8Array }).promise;
    const numPages = pdfDocument.numPages;

    // Extract text from all pages to count words
    let totalWords = 0;
    const wordsPerPage: number[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Count words on this page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        const wordsOnPage = pageText.trim().split(/\s+/).filter(word => word.length > 0).length;
        wordsPerPage.push(wordsOnPage);
        totalWords += wordsOnPage;
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        wordsPerPage.push(0);
      }
    }

    // Calculate average words per page
    const avgWordsPerPage = totalWords / numPages;

    // Conservative processing time estimate (always overestimate to avoid disappointment)
    // Base time: 20 seconds + 25 seconds per page (matches processing page logic)
    const baseTime = 20; // seconds for initial setup
    const timePerPage = 25; // seconds per page (very conservative)
    const estimatedTotalTime = baseTime + (numPages * timePerPage);

    return res.status(200).json({
      success: true,
      metadata: {
        documentId: id,
        numPages,
        totalWords,
        avgWordsPerPage: Math.round(avgWordsPerPage),
        wordsPerPage,
        estimatedProcessingTime: Math.round(estimatedTotalTime), // in seconds
        fileName: document.name
      }
    });

  } catch (error) {
    console.error('Error in document-metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: 'Failed to get document metadata',
      details: errorMessage
    });
  }
} 