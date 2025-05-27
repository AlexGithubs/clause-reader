import React, { useState } from 'react';
import styles from '@/styles/Export.module.css';
import ShareLink from './ShareLink';

interface ExportMenuProps {
  fileId: string;
  clauses: {
    id: string;
    text: string;
    page: number;
    position: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    tags: string[];
    label?: 'favorable' | 'unfavorable' | 'harsh' | 'standard provision';
    explanation?: string;
  }[];
}

const ExportMenu: React.FC<ExportMenuProps> = ({ fileId, clauses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    try {
      setIsExporting(true);

      // Call the export API
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          clauses,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = URL.createObjectURL(blob);

      // Create a link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'pdf' 
        ? `contract-annotated-${fileId}.pdf` 
        : `contract-comments-${fileId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export document. Please try again.');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleShareLink = () => {
    setShowShareModal(true);
    setIsOpen(false);
  };

  return (
    <div className={styles.exportMenuContainer}>
      <button 
        className={styles.exportButton} 
        onClick={toggleMenu}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export ▾'}
      </button>
      
      {isOpen && (
        <div className={styles.menuDropdown}>
          <button 
            className={styles.menuItem}
            onClick={() => handleExport('pdf')}
          >
            <span className={styles.menuIcon}>📄</span>
            Annotated PDF
          </button>
          
          <button 
            className={styles.menuItem}
            onClick={() => handleExport('docx')}
          >
            <span className={styles.menuIcon}>📝</span>
            Word Doc (track-changes)
          </button>
          
          <div className={styles.menuDivider}></div>
          
          <button 
            className={styles.menuItem}
            onClick={handleShareLink}
          >
            <span className={styles.menuIcon}>🔗</span>
            Copy share link
          </button>
        </div>
      )}
      
      {showShareModal && (
        <ShareLink 
          fileId={fileId} 
          onClose={() => setShowShareModal(false)} 
        />
      )}
    </div>
  );
};

export default ExportMenu;