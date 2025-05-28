import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import styles from '../../styles/Processing.module.css';

interface DocumentMetadata {
  documentId: string;
  numPages: number;
  totalWords: number;
  avgWordsPerPage: number;
  wordsPerPage: number[];
  estimatedProcessingTime: number;
  fileName: string;
}

const ProcessingPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Analyzing your contract...');
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [pagesProcessed, setPagesProcessed] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<'extracting' | 'analyzing' | 'finalizing'>('extracting');
  const [isCompleted, setIsCompleted] = useState(false);

  // Conservative time estimates (always overestimate)
  const getConservativeEstimate = (numPages: number): number => {
    // Base time: 20 seconds + 25 seconds per page (very conservative)
    const baseTime = 20;
    const timePerPage = 25;
    return baseTime + (numPages * timePerPage);
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch document metadata
  useEffect(() => {
    if (id && typeof id === 'string' && user) {
      const fetchMetadata = async () => {
        try {
          const response = await fetch(`/api/document-metadata?id=${id}`);
          if (response.ok) {
            const data = await response.json();
            setMetadata(data.metadata);
          }
        } catch (error) {
          console.error('Error fetching document metadata:', error);
        }
      };

      fetchMetadata();
    }
  }, [id, user]);

  // Simple, predictable progress tracking
  useEffect(() => {
    if (!metadata || isCompleted) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
      
      const conservativeTotal = getConservativeEstimate(metadata.numPages);
      const progressRatio = Math.min(0.95, elapsed / conservativeTotal); // Never go above 95% until actually done
      
      // Smooth, monotonic page progress (never goes backwards)
      const newPagesProcessed = Math.floor(progressRatio * metadata.numPages);
      setPagesProcessed(prev => Math.max(prev, newPagesProcessed));
      
      // Phase transitions based on progress ratio
      if (progressRatio < 0.2) {
        setCurrentPhase('extracting');
      } else if (progressRatio < 0.8) {
        setCurrentPhase('analyzing');
      } else {
        setCurrentPhase('finalizing');
      }
    }, 3000); // Update every 3 seconds for smoother feel

    return () => clearInterval(interval);
  }, [startTime, metadata, isCompleted]);

  // Check processing status
  useEffect(() => {
    if (!id || typeof id !== 'string' || !user) {
      if (id && typeof id === 'string') {
        setStatusMessage('Invalid processing request.');
      }
      return;
    }

    console.log(`Processing page mounted for ID: ${id}`);

    const intervalId = setInterval(async () => {
      try {
        console.log(`Checking processing status for document: ${id}`);
        
        const response = await fetch(`/api/user-documents?userId=${user.id}`);
        
        if (!response.ok) {
          console.error('Failed to fetch documents:', await response.text());
          return;
        }
        
        const data = await response.json();
        const documents = data.documents || [];
        const document = documents.find((doc: any) => doc.id === id);
        
        if (document) {
          console.log(`Document found with status: ${document.status}`);
          
          if (document.status === 'completed') {
            console.log(`Document ${id} processing completed. Redirecting...`);
            setIsCompleted(true);
            // Show completion for a moment before redirecting
            if (metadata) {
              setPagesProcessed(metadata.numPages);
            }
            setTimeout(() => {
              clearInterval(intervalId);
              router.push(`/contract/${id}`);
            }, 1500);
          } else if (document.status === 'error') {
            console.log(`Document ${id} processing failed.`);
            setStatusMessage('Processing failed. Please try uploading again.');
            clearInterval(intervalId);
          } else if (document.status === 'processing') {
            setStatusMessage('Still analyzing your contract...');
          }
        } else {
          console.log(`Document ${id} not found yet, still processing...`);
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
        setStatusMessage('An error occurred while checking progress.');
        clearInterval(intervalId);
      }
    }, 3000);

    return () => {
      console.log(`Processing page unmounting for ID: ${id}. Clearing interval.`);
      clearInterval(intervalId);
    };

  }, [id, router, user, metadata]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getPhaseMessage = (phase: string): string => {
    switch (phase) {
      case 'extracting':
        return 'Extracting text from PDF...';
      case 'analyzing':
        return 'Analyzing clauses with AI...';
      case 'finalizing':
        return 'Finalizing analysis...';
      default:
        return 'Processing your contract...';
    }
  };

  const getEstimatedTimeRemaining = (): string => {
    if (!metadata || isCompleted) return '';
    
    const conservativeTotal = getConservativeEstimate(metadata.numPages);
    const remaining = Math.max(10, conservativeTotal - elapsedTime); // Always show at least 10 seconds
    
    return formatTime(remaining);
  };

  if (isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Analyzing Contract</h1>
      
      {metadata && (
        <div className={styles.documentInfo}>
          <h2 className={styles.fileName}>{metadata.fileName}</h2>
          <div className={styles.documentStats}>
            <span>{metadata.numPages} pages</span>
            <span>•</span>
            <span>{metadata.totalWords.toLocaleString()} words</span>
          </div>
        </div>
      )}

      <div className={styles.progressContainer}>
        <div className={styles.loader}></div>
        
        <div className={styles.progressInfo}>
          <p className={styles.phaseMessage}>
            {isCompleted ? 'Analysis complete! Redirecting...' : getPhaseMessage(currentPhase)}
          </p>
          
          {metadata && (
            <div className={styles.progressDetails}>
              <div className={styles.pagesProgress}>
                <span className={styles.progressLabel}>Pages processed:</span>
                <span className={styles.progressValue}>
                  {pagesProcessed}/{metadata.numPages}
                </span>
              </div>
              
              <div className={styles.timeInfo}>
                <div className={styles.timeItem}>
                  <span className={styles.timeLabel}>Elapsed:</span>
                  <span className={styles.timeValue}>{formatTime(elapsedTime)}</span>
                </div>
                {!isCompleted && (
                  <div className={styles.timeItem}>
                    <span className={styles.timeLabel}>Est. remaining:</span>
                    <span className={styles.timeValue}>{getEstimatedTimeRemaining()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ 
            width: metadata ? `${Math.min(100, (pagesProcessed / metadata.numPages) * 100)}%` : '0%' 
          }}
        ></div>
      </div>

      <p className={styles.subtext}>
        {isCompleted 
          ? 'Analysis complete! Taking you to your results...'
          : 'This usually takes 1-3 minutes. You can leave this page, but please don\'t refresh or close it.'
        }
      </p>
    </div>
  );
};

export default ProcessingPage; 