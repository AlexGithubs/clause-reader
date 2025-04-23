import { Handler } from '@netlify/functions';
import formidable from 'formidable';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

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
      filename: (name, ext) => `${randomUUID()}${ext}`,
      filter: (part) => {
        return part.mimetype === 'application/pdf';
      },
    });

    // Parse the request
    form.parse(event, (err, fields, files) => {
      if (err) {
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
    const uploadedFile = files.file;

    if (!uploadedFile) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file uploaded' }),
      };
    }

    // In a real-world scenario, we would store the file in a proper storage service
    // like S3, but for this example, we'll just use a random UUID as the file ID
    // and keep the file in the temporary directory
    const fileId = randomUUID();

    return {
      statusCode: 200,
      body: JSON.stringify({
        fileId,
        message: 'File uploaded successfully',
      }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload file' }),
    };
  }
};