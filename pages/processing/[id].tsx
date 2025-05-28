import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import styles from '../../styles/Processing.module.css'; // We'll create this CSS module next

const ProcessingPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query; // Get the fileId from the URL path
  const { user, isLoading } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Analyzing your contract...');

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!id || typeof id !== 'string' || !user) {
      if (id && typeof id === 'string') {
        setStatusMessage('Invalid processing request.');
      }
      return;
    }

    console.log(`Processing page mounted for ID: ${id}`);

    // Set up an interval to check for completion in the database
    const intervalId = setInterval(async () => {
      try {
        console.log(`Checking processing status for document: ${id}`);
        
        // Fetch user documents from database
        const response = await fetch(`/api/user-documents?userId=${user.id}`);
        
        if (!response.ok) {
          console.error('Failed to fetch documents:', await response.text());
          return;
        }
        
        const data = await response.json();
        const documents = data.documents || [];
        
        // Find the specific document
        const document = documents.find((doc: any) => doc.id === id);
        
        if (document) {
          console.log(`Document found with status: ${document.status}`);
          
          if (document.status === 'completed') {
            console.log(`Document ${id} processing completed. Redirecting...`);
            clearInterval(intervalId);
            router.push(`/contract/${id}`);
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
    }, 3000); // Check every 3 seconds

    // Clean up the interval when the component unmounts
    return () => {
      console.log(`Processing page unmounting for ID: ${id}. Clearing interval.`);
      clearInterval(intervalId);
    };

  }, [id, router, user]);

  if (isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{statusMessage}</h1>
      <div className={styles.loader}></div> 
      <p className={styles.subtext}>This may take a minute or two, especially for longer documents. You may leave this page, but please do not refresh or close the page.</p>
      {/* Optional: Add a button to manually go back? */}
    </div>
  );
};

export default ProcessingPage; 