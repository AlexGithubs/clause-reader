import React, { useState, useEffect } from 'react';
import SplitPane from 'react-split-pane-next';
import PDFViewer from '@/components/pdf/PDFViewer';
import styles from '@/styles/Comparison.module.css';

interface SplitPaneViewProps {
  baseFileId: string;
  baseUrl: string;
  baseClauses: any[];
  revisedFileId: string;
  revisedUrl: string;
  revisedClauses: any[];
  onSync?: (pageNumber: number) => void;
}

const SplitPaneView: React.FC<SplitPaneViewProps> = ({
  baseFileId,
  baseUrl,
  baseClauses,
  revisedFileId,
  revisedUrl,
  revisedClauses,
  onSync
}) => {
  const [syncedPage, setSyncedPage] = useState(1);
  const [syncScrolling, setSyncScrolling] = useState(true);

  const handleBasePage = (pageNumber: number) => {
    if (syncScrolling) {
      setSyncedPage(pageNumber);
      if (onSync) {
        onSync(pageNumber);
      }
    }
  };

  const handleRevisedPage = (pageNumber: number) => {
    if (syncScrolling) {
      setSyncedPage(pageNumber);
      if (onSync) {
        onSync(pageNumber);
      }
    }
  };

  return (
    <div className={styles.splitPaneContainer}>
      <div className={styles.syncControls}>
        <label className={styles.syncLabel}>
          <input
            type="checkbox"
            checked={syncScrolling}
            onChange={() => setSyncScrolling(!syncScrolling)}
            className={styles.syncCheckbox}
          />
          Sync scrolling
        </label>
        <span className={styles.pageIndicator}>Page: {syncedPage}</span>
      </div>
      
      <SplitPane
        split="vertical"
        defaultSize="50%"
        minSize={300}
        className={styles.splitPane}
        paneStyle={{ overflow: 'hidden' }}
      >
        <div className={styles.paneContainer}>
          <div className={styles.paneHeader}>
            <h3 className={styles.paneTitle}>Base Version</h3>
            <span className={styles.fileId}>{baseFileId}</span>
          </div>
          <div className={styles.paneContent}>
            <PDFViewer
              url={baseUrl}
              clauses={baseClauses}
              onPageChange={handleBasePage}
              initialPage={syncedPage}
              syncedPage={syncScrolling ? syncedPage : undefined}
            />
          </div>
        </div>
        
        <div className={styles.paneContainer}>
          <div className={styles.paneHeader}>
            <h3 className={styles.paneTitle}>Revised Version</h3>
            <span className={styles.fileId}>{revisedFileId}</span>
          </div>
          <div className={styles.paneContent}>
            <PDFViewer
              url={revisedUrl}
              clauses={revisedClauses}
              onPageChange={handleRevisedPage}
              initialPage={syncedPage}
              syncedPage={syncScrolling ? syncedPage : undefined}
            />
          </div>
        </div>
      </SplitPane>
    </div>
  );
};

export default SplitPaneView;