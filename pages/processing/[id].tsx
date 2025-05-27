import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Processing.module.css'; // We'll create this CSS module next

const ProcessingPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query; // Get the fileId from the URL path
  const [statusMessage, setStatusMessage] = useState('Analyzing your contract...');

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      // If ID is missing or invalid, maybe redirect to upload or show error
      setStatusMessage('Invalid processing request.');
      return;
    }

    console.log(`Processing page mounted for ID: ${id}`);

    // Set up an interval to check for results in localStorage
    const intervalId = setInterval(() => {
      try {
        // Check for data using the key format the contract page uses
        const storageKey = `document_${id}`;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          console.log(`Data found in localStorage with key ${storageKey} for ID: ${id}. Redirecting...`);
          clearInterval(intervalId); // Stop checking
          router.push(`/contract/${id}`); // Redirect to the contract view page
        } else {
          // Optional: Update status message periodically if needed
          // console.log(`Still processing ID: ${id}, data not found yet...`);
        }
      } catch (error) {
        console.error('Error checking localStorage:', error);
        setStatusMessage('An error occurred while checking progress.');
        clearInterval(intervalId); // Stop on error
      }
    }, 3000); // Check every 3 seconds

    // Clean up the interval when the component unmounts
    return () => {
      console.log(`Processing page unmounting for ID: ${id}. Clearing interval.`);
      clearInterval(intervalId);
    };

  }, [id, router]); // Depend on id and router

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