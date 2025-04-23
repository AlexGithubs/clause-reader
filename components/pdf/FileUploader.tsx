import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from '@/styles/FileUploader.module.css';

interface FileUploaderProps {
  onFileChange: (file: File) => void;
  maxSize: number; // in MB
  acceptedTypes: string[];
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileChange, 
  maxSize,
  acceptedTypes 
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Clear previous errors
    setError(null);
    
    // Check if any files were dropped
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`);
      return;
    }
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large. Maximum size: ${maxSize} MB`);
      return;
    }
    
    onFileChange(file);
  }, [onFileChange, maxSize, acceptedTypes]);
  
  const { 
    getRootProps, 
    getInputProps, 
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({ 
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxSize * 1024 * 1024,
    multiple: false
  });

  return (
    <div className={styles.uploaderContainer}>
      <div 
        {...getRootProps()} 
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${isDragAccept ? styles.accept : ''} ${isDragReject ? styles.reject : ''}`}
      >
        <input {...getInputProps()} />
        <div className={styles.dropzoneContent}>
          <svg className={styles.uploadIcon} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          
          {isDragActive ? (
            <p>Drop the PDF file here...</p>
          ) : (
            <>
              <p>Drag and drop a PDF file here, or click to select</p>
              <span className={styles.fileConstraints}>
                Max size: {maxSize} MB | Accepted type: PDF
              </span>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;