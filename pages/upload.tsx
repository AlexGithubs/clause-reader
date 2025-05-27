import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import FileUploader from '@/components/pdf/FileUploader';
import PreviewPDFViewer from '@/components/pdf/PreviewPDFViewer';
import styles from '@/styles/Dashboard.module.css';

interface UploadResponse {
  fileId: string;
}

const Upload: NextPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (file: File) => {
    setFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  // Helper function to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Result includes the 'data:...' prefix, strip it
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error('Failed to read file as base64'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    // Generate fileId on the frontend
    const fileId = 'processed-' + crypto.randomUUID(); // Use browser's crypto API
    console.log(`Generated frontend fileId: ${fileId}`);

    try {
      setUploadStatus('uploading'); // Initial status is uploading
      console.log("=== PROCESSING PROCESS STARTED (Direct to Extract) ===");
      console.log("File being processed:", file.name, file.size);
      
      // Read file content as base64
      console.log("Reading file content to base64...");
      const fileContentBase64 = await readFileAsBase64(file);
      console.log(`File content read successfully (Base64 length: ${fileContentBase64.length})`);
      
      // --- Initiate /api/extract call (DON'T await) ---
      setUploadStatus('processing'); // Now update status to processing
      console.log(`Initiating background extraction request for fileId: ${fileId}...`);

      // Call fetch but don't wait for it to complete here
      fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send filename, base64 content, AND the generated fileId
        body: JSON.stringify({ 
            fileName: file.name,
            fileContentBase64,
            fileId // Pass the generated ID
        }), 
      }).then(async (extractResponse) => {
          // This runs when the API eventually responds (in the background)
          console.log(`Background extract response status for ${fileId}:`, extractResponse.status);
          if (!extractResponse.ok) {
            const errorText = await extractResponse.text();
            console.error(`Background extract request failed for ${fileId}:`, errorText);
            // How to signal this error to the user on the processing page? Could store an error status in localStorage.
            localStorage.setItem(`error_${fileId}`, `Extraction failed: ${errorText}`);
          } else {
            const extractData = await extractResponse.json();
            console.log(`Background extract successful for ${fileId}. Saving data to localStorage...`);
            // --- Save results to localStorage using the fileId --- 
            try {
              // Use the key format expected by the contract page (`document_[id]`)
              const storageKey = `document_${fileId}`;
              localStorage.setItem(storageKey, JSON.stringify(extractData)); 
              console.log(`Successfully saved results to localStorage for key: ${storageKey}`);
            } catch (storageError) {
              console.error(`Error saving results to localStorage for ${fileId}:`, storageError);
              localStorage.setItem(`error_${fileId}`, `Failed to save results after successful extraction.`);
            }
          }
        }).catch(fetchError => {
          console.error(`Network error during background extract for ${fileId}:`, fetchError);
          localStorage.setItem(`error_${fileId}`, `Network error during extraction: ${fetchError.message}`);
        });

      // --- Redirect to Processing Page IMMEDIATELY after starting the fetch ---
      console.log(`Redirecting to processing page: /processing/${fileId}`);
      router.push(`/processing/${fileId}`);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Upload Contract | Clause Reader</title>
      </Head>

      <h1 className={styles.title}>Upload Contract</h1>
      
      <div className={styles.uploadContainer}>
        {/* Debug tools section - Commented out to prevent mock data creation 
        <div style={{marginBottom: '20px', padding: '10px', border: '1px dashed #ccc', borderRadius: '5px'}}>
          <h3>Debug Tools</h3>
          <p>Having issues with data not appearing? Try creating a test document:</p>
          <button
            onClick={() => {
              // Create a test document in localStorage
              const testDocId = "test-doc-" + Date.now();
              const testData = {
                fileId: testDocId,
                summary: "This is a test document created from the debug button.",
                keyPoints: ["Test point 1", "Test point 2", "Test point 3"],
                highlightedClauses: [
                  {
                    id: "test-clause-1",
                    text: "This is a test clause for debugging purposes.",
                    tags: ["test", "debug"],
                    label: "good",
                    benchmark: {
                      percentile: 25,
                      comparison: "More favorable than 75% of similar clauses"
                    }
                  }
                ]
              };
              
              localStorage.setItem('latestFileId', testDocId);
              localStorage.setItem('document_' + testDocId, JSON.stringify(testData));
              
              alert(`Test document created with ID: ${testDocId}\nCheck the console for details.`);
              console.log("Test document created:", testData);
              console.log("localStorage keys:", Object.keys(localStorage));
              
              // Navigate to dashboard after a delay
              setTimeout(() => {
                router.push('/dashboard');
              }, 1000);
            }}
            style={{padding: '5px 10px', backgroundColor: '#f0f0f0', cursor: 'pointer'}}
          >
            Create Test Document
          </button>
        </div>
        */}
        
        <div className={styles.uploadLeft}>
          <FileUploader 
            onFileChange={handleFileChange} 
            maxSize={10} // 10 MB
            acceptedTypes={['application/pdf']}
          />
          
          {file && (
            <div className={styles.fileDetails}>
              <h3>File Details</h3>
              <p><strong>Name:</strong> {file.name}</p>
              <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Type:</strong> {file.type}</p>
              
              <button 
                className={styles.uploadButton}
                onClick={handleUpload}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              >
                {uploadStatus === 'idle' && 'Upload and Analyze'}
                {uploadStatus === 'uploading' && `Uploading ${uploadProgress}%`}
                {uploadStatus === 'processing' && 'Analyzing with AI...'}
                {uploadStatus === 'success' && 'Success! Redirecting...'}
                {uploadStatus === 'error' && 'Error - Try Again'}
              </button>
              
              {uploadStatus === 'uploading' && (
                <div className={styles.progressBarContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              {uploadStatus === 'error' && (
                <p className={styles.errorMessage}>
                  There was an error uploading or processing your file. Please try again.
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.uploadRight}>
          {previewUrl ? (
            <PreviewPDFViewer url={previewUrl} />
          ) : (
            <div className={styles.previewPlaceholder}>
              <p>PDF preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;