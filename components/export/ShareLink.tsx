import React, { useState, useEffect } from 'react';
import styles from '@/styles/Export.module.css';

interface ShareLinkProps {
  fileId: string;
  onClose: () => void;
}

const ShareLink: React.FC<ShareLinkProps> = ({ fileId, onClose }) => {
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate a token and store it in localStorage
    // This is just a simple implementation for the frontend stub
    const token = Math.random().toString(36).substring(2, 15);
    
    // Save the token in localStorage
    const storedTokens = JSON.parse(localStorage.getItem('shareTokens') || '{}');
    storedTokens[token] = {
      fileId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
    localStorage.setItem('shareTokens', JSON.stringify(storedTokens));
    
    // Generate the share link
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/shared?token=${token}`;
    
    setShareLink(shareUrl);
  }, [fileId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.shareModal}>
        <div className={styles.modalHeader}>
          <h3>Share Contract</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          <p>Share this link for read-only access to this contract:</p>
          
          <div className={styles.linkContainer}>
            <input
              type="text"
              value={shareLink}
              readOnly
              className={styles.linkInput}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            
            <button 
              className={styles.copyButton}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div className={styles.modalNote}>
            <p className={styles.noteText}>
              <strong>Note:</strong> This link will expire in 7 days and provides read-only access.
            </p>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareLink;