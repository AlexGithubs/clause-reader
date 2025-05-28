import { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentById } from '@/lib/supabase-db';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid document ID' });
    }

    console.log(`Fetching PDF for document: ${id} (method: ${req.method})`);

    // Get document from database
    const document = await getDocumentById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.file_path) {
      return res.status(404).json({ error: 'PDF file not found for this document' });
    }

    // For HEAD requests, we just need to check if the file exists
    if (req.method === 'HEAD') {
      // Check if file exists in storage
      const { data, error } = await getSupabaseAdmin().storage
        .from('pdfs')
        .list(document.file_path.split('/').slice(0, -1).join('/'), {
          search: document.file_path.split('/').pop()
        });

      if (error || !data || data.length === 0) {
        return res.status(404).end();
      }

      // Set headers for HEAD response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).end();
    }

    // For GET requests, download and serve the file
    const { data, error } = await getSupabaseAdmin().storage
      .from('pdfs')
      .download(document.file_path);

    if (error) {
      console.error('Error downloading PDF from storage:', error);
      return res.status(500).json({ error: 'Failed to retrieve PDF file' });
    }

    if (!data) {
      return res.status(404).json({ error: 'PDF file not found in storage' });
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await data.arrayBuffer());

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the PDF file
    res.send(buffer);

  } catch (error) {
    console.error('Error in PDF endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: 'Failed to serve PDF file',
      details: errorMessage
    });
  }
} 