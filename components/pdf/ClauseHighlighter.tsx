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
  label?: 'favorable' | 'unfavorable' | 'harsh' | 'standard provision';
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
  const [fullText, setFullText] = useState<string>('');
  const [pdfData, setPdfData] = useState<string | null>(null);

  // Fetch clauses and PDF data for the PDF from localStorage
  useEffect(() => {
    if (!fileId) {
      setError('No file ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`ClauseHighlighter: Attempting to load data for fileId: ${fileId} from localStorage.`);

    try {
      const documentKey = `document_${fileId}`;
      const storedData = localStorage.getItem(documentKey);
        
      if (storedData) {
        console.log(`ClauseHighlighter: Found data in localStorage for key: ${documentKey}`);
        const data = JSON.parse(storedData);
        
        if (data && data.highlightedClauses) {
             // Handle both possible property names (though highlightedClauses should be correct now)
            const clausesData = data.highlightedClauses || data.clauses || [];
            setClauses(clausesData);
             console.log(`ClauseHighlighter: Loaded ${clausesData.length} clauses from localStorage.`);
        
        // Set the full text if available
        if (data.fullText) {
          setFullText(data.fullText);
            } else {
               console.warn("ClauseHighlighter: fullText not found in localStorage data.");
               setFullText(''); // Ensure it's reset if not found
            }

            // Set the PDF base64 data if available
            if (data.fileContentBase64) {
              setPdfData(data.fileContentBase64);
              console.log("ClauseHighlighter: Loaded PDF base64 data from localStorage.");
            } else {
               console.error("ClauseHighlighter: fileContentBase64 not found in localStorage data.");
               setError('Stored document data is missing PDF content.');
               setPdfData(null);
            }
            setError(null);
        } else {
             console.error("ClauseHighlighter: Parsed localStorage data is missing highlightedClauses.", data);
             setError('Stored clause data is invalid or missing clauses.');
             setClauses([]);
        }
      } else {
        console.error(`ClauseHighlighter: No data found in localStorage for key: ${documentKey}`);
        setError(`Analysis data for document ${fileId} not found. Please try re-uploading.`);
        setClauses([]);
        }
      } catch (err) {
      console.error('ClauseHighlighter: Error loading or parsing data from localStorage:', err);
      setError('Failed to load clause data from storage.');
      setClauses([]);
      } finally {
        setLoading(false);
      }

  }, [fileId]); // Rerun when fileId changes

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