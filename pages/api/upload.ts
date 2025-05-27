import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto'; // Use crypto for better IDs
import { saveDocument, getDocumentById } from '../../lib/db'; // Updated DB import path

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath: string | undefined;
  try {
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'tmp'), // Save temporarily
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB limit
      filter: ({ mimetype }) => mimetype === 'application/pdf', // Only allow PDFs
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
          // Clean up any partially uploaded file on parse error
          const file = files.file;
          if (file && !Array.isArray(file) && file.filepath && fs.existsSync(file.filepath)) {
            try { fs.unlinkSync(file.filepath); } catch (cleanupErr) { console.error("Error cleaning up temp file on parse error:", cleanupErr); }
          }
          console.error('Upload error during parsing:', err);
          // Avoid sending multiple responses: return here or handle state differently
          // For simplicity, we log and potentially let the outer catch handle it if res hasn't been sent.
          // However, directly returning might be cleaner if form.parse is the main async operation.
          // If the response hasn't been sent, send an error response.
          if (!res.writableEnded) {
             res.status(500).json({ error: 'Upload failed during parsing' });
          }
          return; 
      }

      const file = files.file;
      // Ensure file exists, is single, and has properties
      if (!file || Array.isArray(file) || !file.filepath || !file.mimetype || !file.size) {
         if (!res.writableEnded) {
             res.status(400).json({ error: 'No valid file uploaded' });
      }
         return;
      }
      tempFilePath = file.filepath; // Store for potential cleanup on error

      // Generate a unique ID using crypto
      const fileId = 'real-upload-' + randomUUID();
      console.log('Upload API: Generated fileId:', fileId, 'for file:', file.originalFilename);

      try {
        // Read the file content from the temporary path
        const fileBuffer = fs.readFileSync(tempFilePath);

        // Save document metadata AND content to database
        // NOTE: Assumes user info might be available via auth middleware/session later
        // For now, using a placeholder user ID.
        const placeholderUserId = 'user-placeholder'; // TODO: Replace with actual user ID
        await saveDocument({
          id: fileId,
          userId: placeholderUserId, 
          filename: file.originalFilename || 'unnamed.pdf',
          fileSize: file.size,
          fileType: file.mimetype,
          fileContent: fileBuffer,
          uploadDate: new Date().toISOString()
        });
        console.log(`Document ${fileId} saved to database.`);

        // --- Immediate Read Test --- 
        try {
           console.log(`Immediately attempting to read back document ${fileId}...`);
           const testRead = getDocumentById(fileId); 
           if (testRead && testRead.fileContent && testRead.fileContent.length > 0) {
             console.log(`IMMEDIATE READ SUCCESS: Found document ${fileId} with buffer size ${testRead.fileContent.length}`);
           } else {
             console.error(`IMMEDIATE READ FAILED: Document ${fileId} not found or buffer missing/empty immediately after save.`);
             console.log(`Test read result:`, testRead); // Log what was returned
           }
        } catch (readError) {
           console.error(`IMMEDIATE READ FAILED: Error during read back for ${fileId}:`, readError);
        }
        // --- End Immediate Read Test --- 

        // Clean up the temporary file ONLY after successful DB save
        fs.unlinkSync(tempFilePath);
        console.log(`Temporary file ${tempFilePath} deleted.`);
        tempFilePath = undefined; // Prevent deletion in outer catch block

        // Return success
         if (!res.writableEnded) {
            res.status(200).json({ fileId, success: true, message: 'File uploaded and saved successfully' });
         }

      } catch (dbOrFileError) {
        console.error('Error during DB save or file cleanup:', dbOrFileError);
        // Attempt cleanup if temp file still exists
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (cleanupErr) { console.error("Error cleaning up temp file after DB error:", cleanupErr); }
        }
        if (!res.writableEnded) {
            res.status(500).json({ error: 'Failed to save document data' });
        }
      }
    });
  } catch (error) {
    // This outer catch might handle errors before form.parse or if form.parse itself throws synchronously
    console.error('Outer Upload error:', error);
     if (!res.writableEnded) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ error: `Upload failed: ${errorMessage}` });
     }
  }
} 