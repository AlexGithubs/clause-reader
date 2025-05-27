import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ClauseHighlighter from '@/components/pdf/ClauseHighlighter';
import ContractChat from '@/components/chat/ContractChat';
import styles from '@/styles/ContractPage.module.css';
import { useAuth } from '@/components/auth/AuthContext';

interface ContractData {
  fileId: string;
  summary: string;
  keyPoints: string[];
  highlightedClauses: any[];
  fullText?: string;
}

const ContractPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading } = useAuth();
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrlError, setPdfUrlError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch contract data from localStorage
  useEffect(() => {
    if (id && typeof id === 'string') {
      try {
        setLoading(true);
        const key = `document_${id}`;
        const data = localStorage.getItem(key);
        
        if (data) {
          const parsedData = JSON.parse(data);
          
          // Ensure each clause has proper position data for highlighting
          if (parsedData.highlightedClauses) {
            parsedData.highlightedClauses = parsedData.highlightedClauses.map((clause: any) => {
              // If missing position data, add default values
              if (!clause.position) {
                clause.position = {
                  top: 100,
                  left: 50,
                  width: 500,
                  height: 30
                };
              }
              // Make sure page property exists
              if (!clause.page) {
                clause.page = 1;
              }
              return clause;
            });
          }
          
          setContractData(parsedData);
          setLoading(false);
        } else {
          setError(`Contract with ID ${id} not found`);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading contract:', error);
        setError('Failed to load contract data');
        setLoading(false);
      }
    }
  }, [id]);

  // Check if PDF URL is valid
  useEffect(() => {
    if (contractData?.fileId?.startsWith('real-upload-')) {
      // Test if the PDF URL is accessible
      const testPdfUrl = async () => {
        try {
          const response = await fetch(`/api/pdf/${contractData.fileId}`);
          if (!response.ok) {
            console.error('PDF not available:', await response.text());
            setPdfUrlError(true);
          }
        } catch (err) {
          console.error('Error checking PDF URL:', err);
          setPdfUrlError(true);
        }
      };
      
      testPdfUrl();
    }
  }, [contractData]);

  if (isLoading || loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Error | Clause Reader</title>
        </Head>
        <div className={styles.errorContainer}>
          <h1>Error</h1>
          <p>{error}</p>
          <Link href="/dashboard" className={styles.backLink}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Contract Not Found | Clause Reader</title>
        </Head>
        <div className={styles.errorContainer}>
          <h1>Contract Not Found</h1>
          <p>The contract you're looking for doesn't exist or has been deleted.</p>
          <Link href="/dashboard" className={styles.backLink}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Generate a PDF URL for the contract
  // For real uploads, we use a placeholder until a proper storage solution is implemented
  // In a production app, this would be a URL to the stored PDF
  let pdfUrl = '/demo-contract.pdf';
  
  // For real uploaded files, construct a URL using the fileId
  if (contractData.fileId.startsWith('real-upload-') && !pdfUrlError) {
    // This is a demonstration URL, in a real app we would have secure storage access
    pdfUrl = `/api/pdf/${contractData.fileId}`;
  }

  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Contract Analysis | Clause Reader</title>
      </Head>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Contract Analysis</h1>
          <div className={styles.actions}>
            <button 
              onClick={toggleChat} 
              className={styles.chatButton}
            >
              {chatOpen ? 'Close Chat' : 'Chat with AI'}
            </button>
            <Link href="/dashboard" className={styles.backLink}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className={styles.summary}>
          <h2>Summary</h2>
          <p>{contractData.summary}</p>
        </div>

        <div className={styles.keyPoints}>
          <h2>Key Points</h2>
          {contractData.keyPoints && contractData.keyPoints.length > 0 ? (
            <ul>
              {contractData.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          ) : (
            <p>No key points found for this contract.</p>
          )}
        </div>
      </div>

      {pdfUrlError && (
        <div className={styles.pdfError}>
          <p>The original PDF file could not be loaded. A demo PDF is being displayed instead.</p>
        </div>
      )}

      <div className={styles.content}>
        <ClauseHighlighter pdfUrl={pdfUrl} fileId={contractData.fileId} />
      </div>

      {chatOpen && (
        <div className={styles.chatContainer}>
          <ContractChat 
            fileId={contractData.fileId}
            clauses={contractData.highlightedClauses || []}
            onClose={toggleChat}
            fullText={contractData.fullText}
          />
        </div>
      )}
    </div>
  );
};

export default ContractPage; 