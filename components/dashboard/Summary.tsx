import React, { useState, useEffect } from 'react';
import ExportMenu from '@/components/export/ExportMenu';
import ChatPanel from '@/components/chat/ChatPanel';
import styles from '@/styles/Dashboard.module.css';
import Link from 'next/link';

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
    label?: 'favorable' | 'unfavorable' | 'harsh' | 'standard provision';
    page: number;
    position: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    benchmark?: {
      percentile: number;
      comparison: string;
    };
  }[];
}

const Summary: React.FC<SummaryProps> = ({ searchQuery, filter }) => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError("");
      
      // Check localStorage for documents
      let documentIdsInStorage = Object.keys(localStorage).filter(
        key => key.startsWith('document_')
      );
      
      if (documentIdsInStorage.length === 0) {
        setError("No documents found. Please upload a document first.");
        setLoading(false);
        return;
      }
      
      // If we have a specific search query, use that ID
      let documentId = searchQuery || '';
      
      // If no search query but we have documents in localStorage, use the first one
      if (!documentId && documentIdsInStorage.length > 0) {
        documentId = documentIdsInStorage[0].replace('document_', '');
      }
      
      console.log(`Fetching summary for document ID: ${documentId}`);
      
      // Try to get from localStorage first
      const storedDocument = localStorage.getItem(`document_${documentId}`);
      if (storedDocument) {
        try {
          const parsedData = JSON.parse(storedDocument);
          if (parsedData.summary && parsedData.highlightedClauses) {
            console.log("Using document from localStorage");
            setSummaryData(parsedData);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing stored document:", e);
          // Continue to API call if parsing fails
        }
      }
      
      try {
        const response = await fetch("/.netlify/functions/summarize-simple", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId: documentId }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          if (response.status === 404) {
            setError(data.message || "Document not found. Please upload a document first.");
          } else {
            setError(`Error: ${data.error || response.statusText}`);
          }
          setLoading(false);
          return;
        }
        
        // Save to localStorage for future use
        localStorage.setItem(`document_${documentId}`, JSON.stringify(data));
        
        setSummaryData(data);
      } catch (err) {
        console.error("Error fetching summary:", err);
        setError("Failed to fetch document summary. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [searchQuery]);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  if (loading) {
    return <div className={styles.loading}>Loading summary...</div>;
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">No Contracts Found</h2>
        <p className="text-gray-700 mb-6">{error}</p>
        <Link href="/upload" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
          Upload Your First Contract
        </Link>
      </div>
    );
  }

  if (!summaryData) {
    return <div className={styles.empty}>No summary data available.</div>;
  }

  return (
    <main className="container">
      <div className={`card ${styles.summaryContainer}`}>
      <div className={styles.summaryHeader}>
        <h2>Simple Summary</h2>
          <div className={styles.summaryActions}>
            <button
              onClick={() => window.location.reload()}
              style={{ marginRight: '10px', fontSize: '14px', padding: '5px 10px' }}
              title="Force refresh the page"
            >
              Refresh
            </button>
            <button 
              className={styles.chatButton}
              onClick={toggleChat}
              title="personal assistant"
            >
              <span className={styles.chatIcon}></span>
              Personal Assistant
            </button>
            <ExportMenu 
              fileId={summaryData.fileId}
              clauses={summaryData.highlightedClauses as any}
            />
          </div>
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
                    
                    {/* Benchmark comparison display */}
                    {clause.benchmark && (
                      <div className={styles.benchmarkBar}>
                        <div className={styles.benchmarkIndicator} style={{ width: `${clause.benchmark.percentile}%` }}>
                          <span className={styles.benchmarkText}>{clause.benchmark.comparison}</span>
                        </div>
                      </div>
                    )}
                </div>
              ))}
          </div>
        )}
      </div>
        
        {/* Chat Panel */}
        {isChatOpen && (
          <ChatPanel 
            fileId={summaryData.fileId}
            clauses={summaryData.highlightedClauses}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        )}
    </div>
    </main>
  );
};

export default Summary;