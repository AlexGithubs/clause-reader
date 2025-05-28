import React, { useState, useEffect } from 'react';
import ExportMenu from '@/components/export/ExportMenu';
import ChatPanel from '@/components/chat/ChatPanel';
import styles from '@/styles/Dashboard.module.css';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';

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
  highlightedClauses: Array<{
    id: string;
    text: string;
    tags: string[];
    label: string;
    benchmark?: {
      percentile: number;
      comparison: string;
    };
  }>;
  fullText?: string;
}

const Summary: React.FC<SummaryProps> = ({ searchQuery, filter }) => {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      
      try {
        console.log(`Fetching documents for user: ${user.id}`);
        
        // Fetch user documents from database
        const response = await fetch(`/api/user-documents?userId=${user.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch documents');
        }
        
        const data = await response.json();
        const documents = data.documents || [];
        
        if (documents.length === 0) {
          setError("No documents found. Please upload a document first.");
          setLoading(false);
          return;
        }
        
        // Find the document to display
        let selectedDocument = null;
        
        if (searchQuery) {
          // If there's a search query, try to find a document with that ID
          selectedDocument = documents.find((doc: any) => doc.id === searchQuery);
        }
        
        // If no specific document found or no search query, use the most recent completed document
        if (!selectedDocument) {
          selectedDocument = documents
            .filter((doc: any) => doc.status === 'completed')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        }
        
        if (!selectedDocument) {
          setError("No completed documents found. Please wait for processing to complete or upload a new document.");
          setLoading(false);
          return;
        }
        
        console.log(`Using document: ${selectedDocument.id}`);
        
        // Transform the document data to match the expected format
        const transformedData: SummaryData = {
          fileId: selectedDocument.id,
          summary: selectedDocument.summary || 'No summary available',
          keyPoints: selectedDocument.keyPoints || [],
          highlightedClauses: selectedDocument.clauses || [],
          fullText: selectedDocument.full_text
        };
        
        setSummaryData(transformedData);
        
      } catch (err) {
        console.error("Error fetching summary:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch document summary. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [searchQuery, user]);

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
        <h3>Highlighted Clauses</h3>
        {summaryData.highlightedClauses.length === 0 ? (
          <div className={styles.noIssues}>
            No concerning clauses found. This contract appears to be well-balanced.
          </div>
        ) : (
          <div className={styles.clauseList}>
            {summaryData.highlightedClauses.map((clause) => (
              <div key={clause.id} className={`${styles.clauseCard} ${styles[clause.label] || ''}`}>
                <div className={styles.clauseTags}>
                  {clause.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>{tag}</span>
                  ))}
                  <span className={`${styles.labelTag} ${styles[clause.label] || ''}`}>
                    {clause.label}
                  </span>
                </div>
                <p className={styles.clauseText}>{clause.text}</p>
                {clause.benchmark && (
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>Benchmark:</strong> {clause.benchmark.comparison}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      
      {isChatOpen && summaryData && (
        <ChatPanel
          fileId={summaryData.fileId}
          clauses={summaryData.highlightedClauses}
          fullText={summaryData.fullText || ''}
          onClose={toggleChat}
        />
      )}
    </main>
  );
};

export default Summary;