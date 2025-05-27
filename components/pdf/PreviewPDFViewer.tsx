import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import styles from '../../styles/PreviewPDFViewer.module.css';

// Fix TextLayer and AnnotationLayer warnings
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

// Use locally hosted PDF.js worker with the exact version needed by react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.js/pdf.worker.min.js`;

// Don't try to set version - it's read-only

interface PreviewPDFViewerProps {
  url: string;
}

const PreviewPDFViewer: React.FC<PreviewPDFViewerProps> = ({ url }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function goToPreviousPage() {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  }

  function goToNextPage() {
    if (pageNumber < (numPages || 1)) {
      setPageNumber(pageNumber + 1);
    }
  }

  function zoomIn() {
    setScale(scale + 0.2);
  }

  function zoomOut() {
    if (scale > 0.6) {
      setScale(scale - 0.2);
    }
  }

  return (
    <div className={styles.pdfContainer}>
      <div className={styles.pdfControls}>
        <div className={styles.pageControls}>
          <button
            className={styles.pageButton}
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
          >
            Previous
          </button>
          <span>
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button
            className={styles.pageButton}
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
          >
            Next
          </button>
          <button className={styles.zoomButton} onClick={zoomOut}>
            -
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button className={styles.zoomButton} onClick={zoomIn}>
            +
          </button>
        </div>
      </div>

      <div className={styles.pdfWrapper}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className={styles.loading}>Loading PDF...</div>}
          error={<div className={styles.error}>Failed to load PDF</div>}
          className={styles.pdfDocument}
        >
          <div className={styles.pageContainer} style={{ transform: `scale(${scale})` }}>
            <Page
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className={styles.pdfPage}
            />
          </div>
        </Document>
      </div>
    </div>
  );
};

export default PreviewPDFViewer; 