import { Handler } from '@netlify/functions';
import formidable from 'formidable';
import { createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { saveDocument } from '@/lib/db';

// Create uploads directory if it doesn't exist
const uploadDir = join(tmpdir(), 'clause-reader-uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Helper function to parse multipart form data
const parseMultipartForm = (event: any): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      uploadDir,
      filter: (part) => {
        return part.mimetype === 'application/pdf';
      },
    });

    // Parse the request
    form.parse(event, (err, fields, files) => {
      if (err) {
        if (files.file && !Array.isArray(files.file) && files.file.filepath && existsSync(files.file.filepath)) {
          try {
            unlinkSync(files.file.filepath);
          } catch (cleanupErr) {
            console.error("Error cleaning up temp file on parse error:", cleanupErr);
          }
        }
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
};

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let tempFilePath: string | undefined;
  try {
    // Check if user is authenticated
    const { user } = context.clientContext || {};
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Parse form data with uploaded file
    const { files } = await parseMultipartForm(event);

    if (!files.file || Array.isArray(files.file) || !files.file.filepath) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No valid file uploaded or file path missing' }),
      };
    }
    const uploadedFile = files.file;
    tempFilePath = uploadedFile.filepath;

    // Generate a unique ID for the document
    const fileId = randomUUID();
    
    // Read the file content from the temporary path
    const fileBuffer = readFileSync(tempFilePath);

    // Save document metadata AND content to database
    await saveDocument({
      id: fileId,
      userId: user.sub, // Netlify Identity user ID
      filename: uploadedFile.originalFilename || 'unnamed.pdf',
      fileSize: uploadedFile.size,
      fileType: uploadedFile.mimetype || 'application/pdf',
      fileContent: fileBuffer,
      uploadDate: new Date().toISOString()
    });

    // Clean up the temporary file after successful DB save
    unlinkSync(tempFilePath);
    tempFilePath = undefined;

    return {
      statusCode: 200,
      body: JSON.stringify({
        fileId,
        message: 'File uploaded successfully',
      }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.error("Error cleaning up temp file after upload error:", cleanupErr);
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to upload file: ${errorMessage}` }),
    };
  }
};