import { NextApiRequest, NextApiResponse } from 'next';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // For development, return mock data
    const mockClauses = [
      {
        id: '1',
        text: 'The Customer agrees to indemnify and hold harmless the Provider from any claims, damages, or expenses arising from the Customer\'s use of the service.',
        page: 1,
        position: {
          top: 100,
          left: 50,
          width: 500,
          height: 30,
        },
        tags: ['liability', 'indemnification'],
        label: 'harsh',
        explanation: 'This is an indemnification clause that places significant liability on the customer. It requires the customer to protect the provider from any claims related to the customer\'s use of the service, which is quite broad.',
      },
      // Add more mock clauses as needed
    ];

    res.status(200).json({ clauses: mockClauses });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
} 