import React, { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import styles from '@/styles/ClauseHighlighter.module.css';

interface Clause {
  id: string;
  text: string;
  page: number;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  tags: string[];
  label?: 'good' | 'bad' | 'harsh' | 'free';
  explanation?: string;
}

interface ClauseHighlighterProps {
  pdfUrl: string;
  fileId: string;
}

const ClauseHighlighter: React.FC<ClauseHighlighterProps> = ({ pdfUrl, fileId }) => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch clauses for the PDF
  useEffect(() => {
    const fetchClauses = async () => {
      try {
        setLoading(true);
        
        // Fetch clauses from API
        const response = await fetch(`/api/extract?fileId=${fileId}`);
        
        if (!response.ok) {
          throw new Error('Failed to load clauses');
        }
        
        const data = await response.json();
        setClauses(data.clauses);
      } catch (err) {
        console.error('Error loading clauses:', err);
        setError('Failed to load clause data');
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      fetchClauses();
    }
  }, [fileId]);

  // Handle clause selection
  const handleClauseClick = (clauseId: string) => {
    const clause = clauses.find(c => c.id === clauseId);
    if (clause) {
      setSelectedClause(clause);
    }
  };

  // Update label for a clause
  const updateClauseLabel = async (clauseId: string, label: 'good' | 'bad' | 'harsh' | 'free') => {
    // Update local state first for responsive UI
    setClauses(prevClauses => 
      prevClauses.map(clause => 
        clause.id === clauseId ? { ...clause, label } : clause
      )
    );
    
    if (selectedClause && selectedClause.id === clauseId) {
      setSelectedClause(prev => prev ? { ...prev, label } : null);
    }
    
    // Update on server
    try {
      const response = await fetch('/api/update-clause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          clauseId,
          label,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update clause');
      }
    } catch (err) {
      console.error('Error updating clause:', err);
      // Could revert the local state change here if needed
    }
  };

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loading}>Loading clauses...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.highlighterLayout}>
          <div className={styles.pdfSection}>
            <PDFViewer 
              url={pdfUrl} 
              clauses={clauses}
              onClauseClick={handleClauseClick}
            />
          </div>
          
          <div className={styles.clausePanel}>
            {selectedClause ? (
              <div className={styles.clauseDetails}>
                <h3 className={styles.clauseTitle}>
                  Clause {selectedClause.id}
                  {selectedClause.label && (
                    <span className={`${styles.labelBadge} ${styles[selectedClause.label]}`}>
                      {selectedClause.label}
                    </span>
                  )}
                </h3>
                
                <div className={styles.tags}>
                  {selectedClause.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>{tag}</span>
                  ))}
                </div>
                
                <div className={styles.clauseText}>
                  <p>{selectedClause.text}</p>
                </div>
                
                {selectedClause.explanation && (
                  <div className={styles.explanation}>
                    <h4>AI Analysis:</h4>
                    <p>{selectedClause.explanation}</p>
                  </div>
                )}
                
                <div className={styles.labelButtons}>
                  <button 
                    className={`${styles.labelButton} ${styles.goodButton} ${selectedClause.label === 'good' ? styles.active : ''}`}
                    onClick={() => updateClauseLabel(selectedClause.id, 'good')}
                  >
                    Good
                  </button>
                  <button 
                    className={`${styles.labelButton} ${styles.badButton} ${selectedClause.label === 'bad' ? styles.active : ''}`}
                    onClick={() => updateClauseLabel(selectedClause.id, 'bad')}
                  >
                    Bad
                  </button>
                  <button 
                    className={`${styles.labelButton} ${styles.harshButton} ${selectedClause.label === 'harsh' ? styles.active : ''}`}
                    onClick={() => updateClauseLabel(selectedClause.id, 'harsh')}
                  >
                    Harsh
                  </button>
                  <button 
                    className={`${styles.labelButton} ${styles.freeButton} ${selectedClause.label === 'free' ? styles.active : ''}`}
                    onClick={() => updateClauseLabel(selectedClause.id, 'free')}
                  >
                    Free
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.noneSelected}>
                <p>Click on a highlighted clause in the document to view details and add labels.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClauseHighlighter;