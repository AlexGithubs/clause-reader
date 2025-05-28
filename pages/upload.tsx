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
  message: string;
}

const Upload: NextPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

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
    setErrorMessage('');
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
    if (!file || !user) return;

    try {
      setUploadStatus('uploading');
      setUploadProgress(10);
      setErrorMessage('');
      
      console.log("=== UPLOAD PROCESS STARTED ===");
      console.log("File being uploaded:", file.name, file.size);
      
      // Read file content as base64
      console.log("Reading file content to base64...");
      const fileContentBase64 = await readFileAsBase64(file);
      console.log(`File content read successfully (Base64 length: ${fileContentBase64.length})`);
      
      setUploadProgress(30);

      // Step 1: Upload PDF to storage and create document record
      console.log("Uploading PDF to storage...");
      const uploadResponse = await fetch('/api/upload-to-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fileName: file.name,
          fileContentBase64,
          userId: user.id
        }), 
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      const documentId = uploadData.fileId;
      console.log(`PDF uploaded successfully. Document ID: ${documentId}`);
      
      setUploadProgress(50);
      setUploadStatus('processing');

      // Step 2: Extract and analyze content
      console.log("Starting content extraction and analysis...");
      const extractResponse = await fetch('/api/extract-to-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentId,
          fileName: file.name,
          fileContentBase64
        }), 
      });

      if (!extractResponse.ok) {
        const errorText = await extractResponse.text();
        throw new Error(`Analysis failed: ${errorText}`);
      }

      const extractData = await extractResponse.json();
      console.log("Content extraction and analysis completed successfully");
      
      setUploadProgress(100);
      setUploadStatus('success');

      // Redirect to the contract page
      setTimeout(() => {
        router.push(`/contract/${documentId}`);
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
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
                {uploadStatus === 'uploading' && `Uploading... ${uploadProgress}%`}
                {uploadStatus === 'processing' && 'Analyzing with AI...'}
                {uploadStatus === 'success' && 'Success! Redirecting...'}
                {uploadStatus === 'error' && 'Error - Try Again'}
              </button>
              
              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <div className={styles.progressBarContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              {uploadStatus === 'error' && (
                <p className={styles.errorMessage}>
                  {errorMessage || 'There was an error uploading or processing your file. Please try again.'}
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