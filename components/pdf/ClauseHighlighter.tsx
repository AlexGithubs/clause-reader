import React, { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import styles from '@/styles/ClauseHighlighter.module.css';
import { useAuth } from '@/components/auth/AuthContext';

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
  label?: 'favorable' | 'unfavorable' | 'harsh' | 'standard provision';
  explanation?: string;
}

interface ClauseHighlighterProps {
  pdfUrl: string;
  fileId: string;
}

const ClauseHighlighter: React.FC<ClauseHighlighterProps> = ({ pdfUrl, fileId }) => {
  const { user } = useAuth();
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fullText, setFullText] = useState<string>('');
  const [pdfData, setPdfData] = useState<string | null>(null);

  // Fetch clauses and PDF data from the database
  useEffect(() => {
    if (!fileId || !user) {
      if (!fileId) {
        setError('No file ID provided.');
      }
      setLoading(false);
      return;
    }

    const fetchClauseData = async () => {
      setLoading(true);
      setError(null);
      console.log(`ClauseHighlighter: Attempting to load data for fileId: ${fileId} from database.`);

      try {
        // Fetch user documents from database
        const response = await fetch(`/api/user-documents?userId=${user.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch documents');
        }
        
        const data = await response.json();
        const documents = data.documents || [];
        
        // Find the specific document
        const document = documents.find((doc: any) => doc.id === fileId);
        
        if (!document) {
          setError(`Document ${fileId} not found. Please try re-uploading.`);
          setClauses([]);
          setLoading(false);
          return;
        }
        
        console.log(`ClauseHighlighter: Found document in database: ${document.id}`);
        
        // Set clauses data
        const clausesData = (document.clauses || []).map((clause: any) => ({
          id: clause.id,
          text: clause.text,
          page: clause.page || 1,
          position: clause.position || {
            top: 100,
            left: 50,
            width: 500,
            height: 30
          },
          tags: clause.tags || [],
          label: clause.label,
          explanation: clause.explanation
        }));
        
        setClauses(clausesData);
        console.log(`ClauseHighlighter: Loaded ${clausesData.length} clauses from database.`);
        
        // Set the full text if available
        if (document.full_text) {
          setFullText(document.full_text);
        } else {
          console.warn("ClauseHighlighter: fullText not found in document data.");
          setFullText('');
        }

        // For PDF data, we'll need to fetch it from storage
        // For now, we'll use the pdfUrl prop instead of base64 data
        setPdfData(null); // We'll rely on pdfUrl instead
        
        setError(null);
        
      } catch (err) {
        console.error('ClauseHighlighter: Error loading data from database:', err);
        setError(err instanceof Error ? err.message : 'Failed to load clause data from database.');
        setClauses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClauseData();
  }, [fileId, user]);

  // Handle clause selection
  const handleClauseClick = (clauseId: string) => {
    const clause = clauses.find(c => c.id === clauseId);
    if (clause) {
      setSelectedClause(clause);
    }
  };

  // Transform clauses to match PDFViewer's expected format
  const transformClausesForPDFViewer = (originalClauses: Clause[]) => {
    return originalClauses.map(clause => ({
      id: clause.id,
      text: clause.text,
      position: {
        pageNumber: clause.page,
        boundingBox: clause.position ? {
          x1: clause.position.left,
          y1: clause.position.top,
          x2: clause.position.left + clause.position.width,
          y2: clause.position.top + clause.position.height
        } : undefined
      },
      tags: clause.tags,
      label: clause.label
    }));
  };

  const transformedClauses = transformClausesForPDFViewer(clauses);
  console.log("Transformed clauses for PDFViewer:", transformedClauses);

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
              pdfData={pdfData}
              pdfUrl={pdfUrl}
              fullText={fullText}
              clauses={transformedClauses}
              onClauseClick={handleClauseClick}
              selectedClauseId={selectedClause?.id}
            />
          </div>
          
          <div className={styles.clausePanel}>
            {selectedClause ? (
              <div className={styles.clauseDetails}>
                <h3 className={styles.clauseTitle}>
                  Selected Clause
                  {selectedClause.label && (
                    <span className={`${styles.labelBadge} ${styles[selectedClause.label.replace(' ', '-')]}`}>
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
                
                {selectedClause.explanation ? (
                  <div className={styles.explanation}>
                    <h4>AI Analysis:</h4>
                    <p>{selectedClause.explanation}</p>
                  </div>
                ) : (
                  <div className={styles.explanation}>
                    <h4>AI Analysis:</h4>
                    <p>
                      {selectedClause.label === 'favorable' && "This clause appears generally favorable or standard."}
                      {selectedClause.label === 'unfavorable' && "This clause may have unfavorable elements that require attention."}
                      {selectedClause.label === 'harsh' && "This clause contains harsh terms that could be detrimental."}
                      {selectedClause.label === 'standard provision' && "This appears to be a standard informational or neutral clause."}
                      {!selectedClause.label && "No analysis available for this clause."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.noneSelected}>
                <p>Click on a highlighted clause in the document to view AI analysis of that clause.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClauseHighlighter;