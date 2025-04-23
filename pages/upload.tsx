import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import FileUploader from '@/components/pdf/FileUploader';
import PDFViewer from '@/components/pdf/PDFViewer';
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

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploadStatus('uploading');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload file to Netlify Function
      const uploadResponse = await new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentCompleted = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(percentCompleted);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
      
      const { fileId } = uploadResponse;
      
      // Process PDF with OpenAI
      setUploadStatus('processing');
      
      const extractResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });
      
      if (!extractResponse.ok) {
        throw new Error('Extraction failed');
      }
      
      setUploadStatus('success');
      
      // Navigate to the dashboard after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
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
            <PDFViewer url={previewUrl} />
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