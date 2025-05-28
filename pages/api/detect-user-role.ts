import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { extractTextWithPositions } from '@/lib/pdf';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Role mapping from broad categories to specific legal titles
const roleMapping = {
  'promise_maker': {
    'service_agreement': 'contractor',
    'employment': 'employee', 
    'rental_lease': 'tenant',
    'sales_purchase': 'seller',
    'licensing': 'licensor',
    'consulting': 'contractor',
    'default': 'contractor'
  },
  'benefit_receiver': {
    'service_agreement': 'client',
    'employment': 'employer',
    'rental_lease': 'landlord', 
    'sales_purchase': 'buyer',
    'licensing': 'licensee',
    'consulting': 'client',
    'default': 'client'
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileContentBase64 } = req.body;

    if (!fileContentBase64) {
      return res.status(400).json({ 
        error: 'Missing required field: fileContentBase64' 
      });
    }

    // Decode base64 content to Buffer
    const pdfBuffer = Buffer.from(fileContentBase64, 'base64');
    
    // Extract text from PDF (first 3 pages only for speed)
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdfArrayBuffer = uint8Array.buffer;
    const textItems = await extractTextWithPositions(pdfArrayBuffer);
    
    // Get text from first 3 pages only
    const firstPagesText = textItems
      .filter(item => item.page <= 3)
      .map(item => item.text)
      .join(' ')
      .substring(0, 3000); // Limit to 3000 chars for speed

    if (!firstPagesText || firstPagesText.trim().length < 100) {
      return res.status(400).json({ 
        error: 'Insufficient text content for role detection' 
      });
    }

    // Use OpenAI to analyze the contract and determine user role
    const analysisPrompt = `Analyze this contract excerpt and determine:
1. What type of contract this is (service_agreement, employment, rental_lease, sales_purchase, licensing, consulting, or other)
2. Based on the language and structure, is the user most likely the party who:
   - MAKES PROMISES (delivers services, goods, work, maintains confidentiality, provides warranties) 
   - RECEIVES BENEFITS (gets payment, services, goods, rights, protections)

Contract text: "${firstPagesText}"

Respond with ONLY a JSON object in this format:
{
  "contract_type": "service_agreement|employment|rental_lease|sales_purchase|licensing|consulting|other",
  "user_role": "promise_maker|benefit_receiver",
  "confidence": 0.8,
  "reasoning": "Brief explanation of why you think this"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a legal AI that analyzes contracts to determine user roles. Be concise and accurate." 
        },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '{}';
    
    // Parse the AI response
    let analysis;
    try {
      // Strip markdown if present
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      // Fallback to default
      analysis = {
        contract_type: 'other',
        user_role: 'benefit_receiver',
        confidence: 0.3,
        reasoning: 'Could not determine from contract text'
      };
    }

    // Map the broad role to specific legal title
    const contractType = analysis.contract_type || 'other';
    const userRole = analysis.user_role || 'benefit_receiver';
    
    const specificRole = roleMapping[userRole]?.[contractType] || roleMapping[userRole]?.default || 'other';

    // Create user-friendly labels
    const roleLabels = {
      'promise_maker': 'Making Promises',
      'benefit_receiver': 'Receiving Benefits'
    };

    const specificRoleLabels = {
      'buyer': 'Buyer',
      'seller': 'Seller', 
      'client': 'Client',
      'contractor': 'Contractor/Service Provider',
      'employer': 'Employer',
      'employee': 'Employee',
      'landlord': 'Landlord',
      'tenant': 'Tenant',
      'licensor': 'Licensor',
      'licensee': 'Licensee',
      'other': 'Other Party'
    };

    return res.status(200).json({
      success: true,
      detected_role: {
        broad_category: userRole,
        broad_label: roleLabels[userRole],
        specific_role: specificRole,
        specific_label: specificRoleLabels[specificRole],
        contract_type: contractType,
        confidence: analysis.confidence || 0.5,
        reasoning: analysis.reasoning || 'Automated detection based on contract language'
      }
    });

  } catch (error) {
    console.error('Error in detect-user-role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: 'Failed to detect user role',
      details: errorMessage
    });
  }
} 