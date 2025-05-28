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
  const { reanalyze } = router.query; // Check for re-analysis parameter
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  
  // New role detection states
  const [roleDetectionStep, setRoleDetectionStep] = useState<'detecting' | 'confirming' | 'manual' | 'completed'>('detecting');
  const [detectedRole, setDetectedRole] = useState<any>(null);
  const [broadRoleChoice, setBroadRoleChoice] = useState<'promise_maker' | 'benefit_receiver' | ''>('');
  const [isDetecting, setIsDetecting] = useState(false);

  // Simplified role options for manual selection
  const contextualRoleOptions = {
    'promise_maker': [
      { value: 'contractor', label: 'Service Provider/Contractor' },
      { value: 'employee', label: 'Employee' },
      { value: 'tenant', label: 'Tenant/Renter' },
      { value: 'seller', label: 'Seller' },
      { value: 'licensor', label: 'Licensor (Granting Rights)' }
    ],
    'benefit_receiver': [
      { value: 'client', label: 'Client/Customer' },
      { value: 'employer', label: 'Employer' },
      { value: 'landlord', label: 'Landlord/Property Owner' },
      { value: 'buyer', label: 'Buyer' },
      { value: 'licensee', label: 'Licensee (Receiving Rights)' }
    ]
  };

  const partyOptions = [
    { value: 'buyer', label: 'Buyer' },
    { value: 'seller', label: 'Seller' },
    { value: 'client', label: 'Client' },
    { value: 'contractor', label: 'Contractor/Service Provider' },
    { value: 'employer', label: 'Employer' },
    { value: 'employee', label: 'Employee' },
    { value: 'landlord', label: 'Landlord' },
    { value: 'tenant', label: 'Tenant' },
    { value: 'party_a', label: 'Party A (First Party)' },
    { value: 'party_b', label: 'Party B (Second Party)' },
    { value: 'other', label: 'Other' }
  ];

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Handle re-analysis if reanalyze parameter is present
  useEffect(() => {
    if (reanalyze && typeof reanalyze === 'string' && user) {
      setIsReanalyzing(true);
      // You could fetch the original document here if needed
      // For now, we'll just show a message and let user upload a new file
    }
  }, [reanalyze, user]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = async (file: File) => {
    setFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setSelectedParty(''); // Reset party selection when new file is selected
    setRoleDetectionStep('detecting');
    setDetectedRole(null);
    setBroadRoleChoice('');
    
    // Start automatic role detection
    await detectUserRole(file);
  };

  const detectUserRole = async (file: File) => {
    setIsDetecting(true);
    try {
      const fileContentBase64 = await readFileAsBase64(file);
      
      const response = await fetch('/api/detect-user-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileContentBase64 }),
      });

      if (response.ok) {
        const data = await response.json();
        setDetectedRole(data.detected_role);
        setSelectedParty(data.detected_role.specific_role);
        setRoleDetectionStep('confirming');
      } else {
        console.error('Role detection failed');
        setRoleDetectionStep('manual');
      }
    } catch (error) {
      console.error('Error detecting role:', error);
      setRoleDetectionStep('manual');
    } finally {
      setIsDetecting(false);
    }
  };

  const confirmDetectedRole = () => {
    setRoleDetectionStep('completed');
  };

  const rejectDetectedRole = () => {
    setDetectedRole(null);
    setSelectedParty('');
    setRoleDetectionStep('manual');
  };

  const handleBroadRoleChoice = (choice: 'promise_maker' | 'benefit_receiver') => {
    setBroadRoleChoice(choice);
    // Auto-select the first option from the contextual list
    const firstOption = contextualRoleOptions[choice][0];
    setSelectedParty(firstOption.value);
  };

  const handleSpecificRoleChoice = (role: string) => {
    setSelectedParty(role);
    setRoleDetectionStep('completed');
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

    // Validate party selection
    if (!selectedParty || roleDetectionStep !== 'completed') {
      setErrorMessage('Please complete the role selection process before uploading.');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadProgress(10);
      setErrorMessage('');
      
      console.log("=== UPLOAD PROCESS STARTED ===");
      console.log("File being uploaded:", file.name, file.size);
      console.log("User party:", selectedParty);
      
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
          userId: user.id,
          userParty: selectedParty
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

      // Start extraction and analysis in background (don't wait for completion)
      console.log("Starting content extraction and analysis in background...");
      fetch('/api/extract-to-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentId,
          fileName: file.name,
          fileContentBase64
        }), 
      }).catch(error => {
        console.error('Background extraction error:', error);
      });

      // Redirect to the processing page immediately to show progress
      router.push(`/processing/${documentId}`);

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

      <h1 className={styles.title}>
        {isReanalyzing ? 'Re-analyze Contract with Correct Role' : 'Upload Contract'}
      </h1>
      
      {isReanalyzing && (
        <div style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '1rem',
          margin: '1rem 0',
          color: '#1e40af'
        }}>
          <p style={{ margin: 0, fontWeight: 500 }}>
            🔄 You're re-analyzing this contract. Please upload the same file and select the correct role for more accurate analysis.
          </p>
        </div>
      )}
      
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
              
              {/* Role Detection UI */}
              <div className={styles.roleDetection}>
                <h4>🎯 Identifying Your Role</h4>
                
                {/* Step 1: Detecting */}
                {roleDetectionStep === 'detecting' && (
                  <div className={styles.detectingStep}>
                    {isDetecting ? (
                      <div className={styles.detectingLoader}>
                        <div className={styles.spinner}></div>
                        <p>Analyzing contract to identify your role...</p>
                      </div>
                    ) : (
                      <p>Preparing to analyze contract...</p>
                    )}
                  </div>
                )}

                {/* Step 2: Confirming detected role */}
                {roleDetectionStep === 'confirming' && detectedRole && (
                  <div className={styles.confirmingStep}>
                    <div className={styles.detectedRoleCard}>
                      <div className={styles.detectedRoleHeader}>
                        <span className={styles.confidenceIndicator}>
                          {detectedRole.confidence > 0.7 ? '🎯' : detectedRole.confidence > 0.5 ? '🤔' : '❓'}
                        </span>
                        <div>
                          <h5>We think you're the:</h5>
                          <p className={styles.detectedRoleTitle}>{detectedRole.specific_label}</p>
                          <p className={styles.detectedRoleReason}>{detectedRole.reasoning}</p>
                        </div>
                      </div>
                      <div className={styles.confirmButtons}>
                        <button 
                          className={styles.confirmButton}
                          onClick={confirmDetectedRole}
                        >
                          ✓ That's right
                        </button>
                        <button 
                          className={styles.rejectButton}
                          onClick={rejectDetectedRole}
                        >
                          ✗ Not quite
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Manual selection */}
                {roleDetectionStep === 'manual' && (
                  <div className={styles.manualStep}>
                    <p className={styles.manualPrompt}>
                      In this contract, are you primarily:
                    </p>
                    
                    {!broadRoleChoice ? (
                      <div className={styles.broadChoices}>
                        <button
                          className={styles.broadChoice}
                          onClick={() => handleBroadRoleChoice('promise_maker')}
                        >
                          <div className={styles.choiceIcon}>📋</div>
                          <div className={styles.choiceContent}>
                            <h5>Making Promises</h5>
                            <p>Delivering services, goods, work, maintaining confidentiality</p>
                          </div>
                        </button>
                        <button
                          className={styles.broadChoice}
                          onClick={() => handleBroadRoleChoice('benefit_receiver')}
                        >
                          <div className={styles.choiceIcon}>💰</div>
                          <div className={styles.choiceContent}>
                            <h5>Receiving Benefits</h5>
                            <p>Getting payment, services, rights, protections</p>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className={styles.specificChoices}>
                        <p className={styles.specificPrompt}>
                          More specifically, you are the:
                        </p>
                        <div className={styles.specificRoleList}>
                          {contextualRoleOptions[broadRoleChoice].map(option => (
                            <button
                              key={option.value}
                              className={`${styles.specificRole} ${selectedParty === option.value ? styles.selected : ''}`}
                              onClick={() => handleSpecificRoleChoice(option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <button 
                          className={styles.backButton}
                          onClick={() => setBroadRoleChoice('')}
                        >
                          ← Back to broad categories
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Completed */}
                {roleDetectionStep === 'completed' && (
                  <div className={styles.completedStep}>
                    <div className={styles.selectedRoleDisplay}>
                      <span className={styles.checkmark}>✅</span>
                      <div>
                        <p><strong>Your role:</strong> {contextualRoleOptions.promise_maker.find(r => r.value === selectedParty)?.label || 
                                                        contextualRoleOptions.benefit_receiver.find(r => r.value === selectedParty)?.label || 
                                                        selectedParty}</p>
                        <p className={styles.analysisNote}>
                          Clauses will be analyzed from your perspective
                        </p>
                      </div>
                    </div>
                    <button 
                      className={styles.changeRoleButton}
                      onClick={() => setRoleDetectionStep('manual')}
                    >
                      Change role
                    </button>
                  </div>
                )}
              </div>
              
              <div style={{ position: 'relative' }}>
                <button 
                  className={styles.uploadButton}
                  onClick={handleUpload}
                  disabled={uploadStatus === 'uploading' || uploadStatus === 'processing' || roleDetectionStep !== 'completed'}
                  title={roleDetectionStep !== 'completed' ? 'Please select your role first' : ''}
                >
                  {uploadStatus === 'idle' && 'Upload and Analyze'}
                  {uploadStatus === 'uploading' && `Uploading... ${uploadProgress}%`}
                  {uploadStatus === 'processing' && 'Analyzing with AI...'}
                  {uploadStatus === 'error' && 'Error - Try Again'}
                </button>
                
                {roleDetectionStep !== 'completed' && uploadStatus === 'idle' && (
                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: '#6b7280', 
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    Please select your role above to continue
                  </p>
                )}
              </div>
              
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