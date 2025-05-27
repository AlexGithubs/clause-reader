import { Handler } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import { createDocument, uploadPdf } from '../../lib/supabase-db';
import { supabase } from '../../lib/supabase';

const handler: Handler = async (event, context) => {
  // CORS preflight 
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    // Parse the incoming JSON
    const { fileName, fileData, userId } = JSON.parse(event.body);

    if (!fileName || !fileData || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'fileName, fileData, and userId are required' }),
      };
    }

    // Remove data:application/pdf;base64, prefix if present
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '');

    // Upload to Supabase Storage
    const { filePath, publicUrl } = await uploadPdf(userId, fileName, base64Data);

    // Create document record in database
    const documentId = await createDocument(userId, fileName, filePath);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        fileId: documentId,
        fileName,
        url: publicUrl
      }),
    };
  } catch (error) {
    console.error('Error in upload function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process upload' }),
    };
  }
};

export { handler }; 