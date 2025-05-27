import { Handler } from '@netlify/functions';
import { getDb, closeDb } from '@/lib/db';

// Sample data for canonical clauses
const sampleClauses = [
  {
    tag: 'liability',
    avg_severity: 0.7,
    sample_clause: 'The Customer agrees to indemnify and hold harmless the Provider from any claims, damages, or expenses arising from the Customer\'s use of the service.'
  },
  {
    tag: 'termination',
    avg_severity: 0.3,
    sample_clause: 'Either party may terminate this agreement with 30 days written notice.'
  },
  {
    tag: 'payment',
    avg_severity: 0.65,
    sample_clause: 'Payment terms are net 15 days from invoice date. Late payments will incur a 10% monthly interest charge.'
  },
  {
    tag: 'confidentiality',
    avg_severity: 0.5,
    sample_clause: 'The receiving party shall hold and maintain the confidential information in strictest confidence for the sole and exclusive benefit of the disclosing party.'
  },
  {
    tag: 'intellectual_property',
    avg_severity: 0.6,
    sample_clause: 'All intellectual property rights in the service shall remain the exclusive property of the Provider.'
  },
  {
    tag: 'warranty',
    avg_severity: 0.75,
    sample_clause: 'The service is provided "as is" without warranties of any kind, either express or implied.'
  },
  {
    tag: 'limitation_of_liability',
    avg_severity: 0.8,
    sample_clause: 'In no event shall Provider be liable for any indirect, incidental, special, exemplary, or consequential damages.'
  },
  {
    tag: 'force_majeure',
    avg_severity: 0.4,
    sample_clause: 'Neither party shall be liable for any failure or delay in performance due to circumstances beyond its reasonable control.'
  },
  {
    tag: 'governing_law',
    avg_severity: 0.3,
    sample_clause: 'This agreement shall be governed by the laws of the State of California.'
  },
  {
    tag: 'dispute_resolution',
    avg_severity: 0.5,
    sample_clause: 'Any dispute arising out of this agreement shall be resolved through binding arbitration.'
  }
];

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const db = getDb();
    
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // First, clear existing data if requested
      const { clearExisting } = JSON.parse(event.body || '{}');
      
      if (clearExisting) {
        db.exec('DELETE FROM canonical_clauses');
      }
      
      // Insert sample data
      const insertStmt = db.prepare(`
        INSERT INTO canonical_clauses (tag, avg_severity, sample_clause, occurrence_count)
        VALUES (?, ?, ?, 100)
        ON CONFLICT (tag) DO UPDATE SET
          avg_severity = ?,
          sample_clause = COALESCE(?, sample_clause),
          occurrence_count = 100
      `);
      
      sampleClauses.forEach(clause => {
        insertStmt.run(
          clause.tag,
          clause.avg_severity,
          clause.sample_clause,
          clause.avg_severity,
          clause.sample_clause
        );
      });
      
      // Commit transaction
      db.exec('COMMIT');
      
      // Get the updated data
      const allTags = db.prepare('SELECT tag, avg_severity, occurrence_count FROM canonical_clauses').all();
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Database seeded successfully',
          tagCount: allTags.length,
          tags: allTags
        }),
      };
    } catch (err) {
      // Rollback on error
      db.exec('ROLLBACK');
      throw err;
    } finally {
      // Pass the db instance to closeDb
      closeDb(db);
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to seed database' }),
    };
  }
};