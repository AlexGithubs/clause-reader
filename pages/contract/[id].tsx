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
  filePath?: string;
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

  // Fetch contract data from database
  useEffect(() => {
    if (id && typeof id === 'string' && user) {
      const fetchContractData = async () => {
        try {
          setLoading(true);
          console.log(`Fetching contract data for ID: ${id}`);
          
          // Fetch user documents from database
          const response = await fetch(`/api/user-documents?userId=${user.id}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch documents');
          }
          
          const data = await response.json();
          const documents = data.documents || [];
          
          // Find the specific document
          const document = documents.find((doc: any) => doc.id === id);
          
          if (!document) {
            setError(`Contract with ID ${id} not found`);
            setLoading(false);
            return;
          }
          
          // Transform the document data to match the expected format
          const transformedData: ContractData = {
            fileId: document.id,
            summary: document.summary || 'No summary available',
            keyPoints: document.keyPoints || [],
            highlightedClauses: (document.clauses || []).map((clause: any) => ({
              id: clause.id,
              text: clause.text,
              tags: clause.tags || [],
              label: clause.label,
              page: clause.page || 1,
              position: clause.position || {
                top: 100,
                left: 50,
                width: 500,
                height: 30
              },
              explanation: clause.explanation,
              benchmark: clause.benchmark
            })),
            fullText: document.full_text,
            filePath: document.file_path
          };
          
          setContractData(transformedData);
          setLoading(false);
          
        } catch (error) {
          console.error('Error loading contract:', error);
          setError(error instanceof Error ? error.message : 'Failed to load contract data');
          setLoading(false);
        }
      };

      fetchContractData();
    }
  }, [id, user]);

  // Check if PDF URL is valid
  useEffect(() => {
    if (contractData?.fileId && contractData?.filePath) {
      // Test if the PDF URL is accessible
      const testPdfUrl = async () => {
        try {
          const response = await fetch(`/api/pdf/${contractData.fileId}`, { method: 'HEAD' });
          if (!response.ok) {
            console.error('PDF not available:', response.status);
            setPdfUrlError(true);
          } else {
            setPdfUrlError(false);
          }
        } catch (err) {
          console.error('Error checking PDF URL:', err);
          setPdfUrlError(true);
        }
      };
      
      testPdfUrl();
    } else if (contractData && !contractData.filePath) {
      // No file path means no PDF available
      setPdfUrlError(true);
    }
  }, [contractData?.fileId, contractData?.filePath]);

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
  let pdfUrl = '/demo-contract.pdf';
  
  // For uploaded files, construct a URL using the fileId
  if (contractData.filePath && !pdfUrlError) {
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