import { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentsByUserId, getClausesByDocumentId } from '@/lib/supabase-db';
import { getSupabaseAdmin } from '@/lib/supabase';

// Helper function to map score to label for display
function scoreToLabel(score: number): string {
  if (score >= 70) return 'favorable';
  if (score >= 40) return 'standard provision';
  if (score >= 20) return 'unfavorable';
  return 'harsh';
}

// Helper function to generate benchmark data from score
function scoreToBenchmark(score: number, tags: string[]) {
  const percentile = Math.round(score);
  const comparison = score > 50 
    ? `More favorable than ${Math.round(100 - score)}% of similar clauses`
    : `Harsher than ${Math.round(score)}% of similar clauses`;
    
  return {
    severity: score / 100, // Convert to 0-1 scale for compatibility
    percentile,
    tag: tags?.[0] || '',
    comparison
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId parameter' });
    }

    console.log(`Fetching documents for user: ${userId}`);

    // Get user documents from database
    const documents = await getDocumentsByUserId(userId);
    console.log(`Found ${documents.length} documents for user ${userId}`);

    // For each document, get its clauses and key points
    const documentsWithData = await Promise.all(
      documents.map(async (doc) => {
        try {
          // Get clauses for this document
          const clauses = await getClausesByDocumentId(doc.id);
          
          // Get key points for this document using admin client
          const supabaseAdmin = getSupabaseAdmin();
          if (!supabaseAdmin) {
            throw new Error('Supabase admin client not available');
          }

          const { data: keyPoints, error: keyPointsError } = await supabaseAdmin
            .from('key_points')
            .select('point_text')
            .eq('document_id', doc.id);

          if (keyPointsError) {
            console.error(`Error fetching key points for document ${doc.id}:`, keyPointsError);
          }

          return {
            id: doc.id,
            name: doc.name,
            summary: doc.summary,
            status: doc.status,
            created_at: doc.created_at,
            file_path: doc.file_path,
            full_text: doc.full_text,
            contract_type: doc.contract_type,
            role_validation: doc.role_validation,
            clauses: clauses.map(clause => {
              const label = scoreToLabel(clause.score);
              const benchmark = scoreToBenchmark(clause.score, clause.tags);
              
              return {
                id: clause.id,
                text: clause.text,
                page: clause.page,
                position: clause.position,
                tags: clause.tags,
                label: label,
                explanation: clause.explanation,
                score: clause.score,
                benchmark: benchmark
              };
            }),
            keyPoints: keyPoints?.map(kp => kp.point_text) || []
          };
        } catch (error) {
          console.error(`Error fetching data for document ${doc.id}:`, error);
          return {
            id: doc.id,
            name: doc.name,
            summary: doc.summary,
            status: doc.status,
            created_at: doc.created_at,
            file_path: doc.file_path,
            full_text: doc.full_text,
            contract_type: doc.contract_type,
            role_validation: doc.role_validation,
            clauses: [],
            keyPoints: []
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      documents: documentsWithData
    });

  } catch (error) {
    console.error('Error in user-documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: 'Failed to fetch user documents',
      details: errorMessage
    });
  }
} 