import { NextApiRequest, NextApiResponse } from 'next';
import { createDocument, uploadPdf } from '@/lib/supabase-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileContentBase64, userId, userParty } = req.body;

    if (!fileName || !fileContentBase64 || !userId || !userParty) {
      return res.status(400).json({ 
        error: 'Missing required fields: fileName, fileContentBase64, userId, userParty' 
      });
    }

    // Validate userParty value
    const validParties = ['party_a', 'party_b', 'buyer', 'seller', 'client', 'contractor', 'employer', 'employee', 'landlord', 'tenant', 'other'];
    if (!validParties.includes(userParty)) {
      return res.status(400).json({ 
        error: 'Invalid userParty value' 
      });
    }

    console.log(`Uploading PDF for user ${userId}: ${fileName} (Party: ${userParty})`);

    // Upload PDF to Supabase storage
    const { filePath, publicUrl } = await uploadPdf(userId, fileName, fileContentBase64);
    console.log(`PDF uploaded to storage: ${filePath}`);

    // Create document record in database with user party
    const documentId = await createDocument(userId, fileName, filePath, undefined, userParty);
    console.log(`Document record created: ${documentId}`);

    return res.status(200).json({
      success: true,
      fileId: documentId,
      fileName,
      filePath,
      publicUrl,
      userParty,
      message: 'PDF uploaded successfully'
    });

  } catch (error) {
    console.error('Error in upload-to-db:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: 'Failed to upload PDF',
      details: errorMessage
    });
  }
} 