import React, { useState, useEffect } from 'react';
import styles from '@/styles/Dashboard.module.css';

interface SummaryProps {
  searchQuery: string;
  filter: {
    tag: string;
    label: string;
    length: string;
  };
}

interface SummaryData {
  fileId: string;
  summary: string;
  keyPoints: string[];
  highlightedClauses: {
    id: string;
    text: string;
    tags: string[];
    label: 'good' | 'bad' | 'harsh' | 'free';
  }[];
}

const Summary: React.FC<SummaryProps> = ({ searchQuery, filter }) => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch summary data (placeholder for API call)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        
        // In a real application, this would be a call to the API
        // const response = await fetch('/api/summarize-simple');
        // const data = await response.json();
        
        // Mock data for development
        const mockData: SummaryData = {
          fileId: '123',
          summary: 'This contract includes standard terms but contains several clauses that could be problematic. The indemnification clause is particularly harsh, requiring the customer to absorb significant liability. The payment terms are also quite strict with high penalties for late payment. However, the termination clause is fair and balanced.',
          keyPoints: [
            'Indemnification clause places excessive liability on the customer.',
            'Payment terms require net 15 days with 10% monthly interest on late payments.',
            'Termination clause allows either party to end with 30 days notice.',
            'Contract lacks clear dispute resolution mechanism.',
            'Confidentiality terms are industry standard.'
          ],
          highlightedClauses: [
            {
              id: '1',
              text: 'The Customer agrees to indemnify and hold harmless the Provider from any claims, damages, or expenses arising from the Customer\'s use of the service.',
              tags: ['liability', 'indemnification'],
              label: 'harsh'
            },
            {
              id: '3',
              text: 'Payment terms are net 15 days from invoice date. Late payments will incur a 10% monthly interest charge.',
              tags: ['payment', 'terms'],
              label: 'bad'
            }
          ]
        };
        
        setSummaryData(mockData);
        setError(null);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setError('Failed to load summary data');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading summary...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!summaryData) {
    return <div className={styles.empty}>No summary data available.</div>;
  }

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryHeader}>
        <h2>Simple Summary</h2>
      </div>
      
      <div className={styles.summaryContent}>
        <div className={styles.summaryText}>
          <h3>Overview</h3>
          <p>{summaryData.summary}</p>
        </div>
        
        <div className={styles.keyPoints}>
          <h3>Key Points</h3>
          <ul>
            {summaryData.keyPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className={styles.highlightedClauses}>
        <h3>Issues to Review</h3>
        
        {summaryData.highlightedClauses.length === 0 ? (
          <p className={styles.noIssues}>No significant issues found.</p>
        ) : (
          <div className={styles.clauseList}>
            {summaryData.highlightedClauses
              .filter(clause => {
                // Apply filters
                if (searchQuery && !clause.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                if (filter.tag && !clause.tags.includes(filter.tag)) {
                  return false;
                }
                if (filter.label && clause.label !== filter.label) {
                  return false;
                }
                return true;
              })
              .map(clause => (
                <div key={clause.id} className={`${styles.clauseCard} ${styles[clause.label]}`}>
                  <div className={styles.clauseTags}>
                    {clause.tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>{tag}</span>
                    ))}
                    <span className={`${styles.labelTag} ${styles[clause.label]}`}>
                      {clause.label}
                    </span>
                  </div>
                  <p className={styles.clauseText}>{clause.text}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;