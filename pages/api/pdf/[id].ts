import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid PDF ID' });
  }

  // Security check - prevent path traversal attacks
  if (!id.startsWith('real-upload-') || id.includes('..')) {
    return res.status(400).json({ error: 'Invalid PDF ID format' });
  }

  try {
    // Find the PDF file in the uploads directory
    const uploadsDir = path.join(process.cwd(), 'tmp');
    
    // List all files in the directory
    const files = await fs.promises.readdir(uploadsDir);
    
    // Find the most recently uploaded PDF file
    // In a production app, you would have a database mapping IDs to specific files
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      return res.status(404).json({ error: 'PDF file not found' });
    }
    
    // For demo purposes, just serve the most recent PDF
    // In a production app, you would find the specific file associated with the ID
    const fileStats = await Promise.all(
      pdfFiles.map(async (file) => {
        const stats = await fs.promises.stat(path.join(uploadsDir, file));
        return { file, ctime: stats.ctime };
      })
    );
    
    // Sort by creation time (most recent first)
    fileStats.sort((a, b) => b.ctime.getTime() - a.ctime.getTime());
    
    if (fileStats.length === 0) {
      return res.status(404).json({ error: 'No PDF files found' });
    }
    
    // Use the most recent file
    const filePath = path.join(uploadsDir, fileStats[0].file);
    
    // Read the file
    const pdfBuffer = await fs.promises.readFile(filePath);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileStats[0].file}"`);
    
    // Send the PDF file
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error serving PDF file:', error);
    res.status(500).json({ error: 'Error serving PDF file' });
  }
} 