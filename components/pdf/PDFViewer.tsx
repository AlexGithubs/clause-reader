import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import styles from '@/styles/PDFViewer.module.css';

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  clauses?: {
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
    label?: 'good' | 'bad' | 'harsh' | 'free';
  }[];
  onClauseClick?: (clauseId: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  url, 
  clauses = [], 
  onClauseClick 
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return newPageNumber >= 1 && newPageNumber <= (numPages || 1) 
        ? newPageNumber 
        : prevPageNumber;
    });
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.1, 2.0));
  }

  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.1, 0.5));
  }

  return (
    <div className={styles.pdfContainer}>
      <div className={styles.pdfControls}>
        <div className={styles.pageControls}>
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
            className={styles.pageButton}
          >
            ‹
          </button>
          <span>
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button
            type="button"
            disabled={numPages !== null && pageNumber >= numPages}
            onClick={nextPage}
            className={styles.pageButton}
          >
            ›
          </button>
        </div>
        
        <div className={styles.zoomControls}>
          <button onClick={zoomOut} className={styles.zoomButton}>
            -
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className={styles.zoomButton}>
            +
          </button>
        </div>
      </div>

      <div className={styles.pdfWrapper}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          className={styles.pdfDocument}
          loading={<div className={styles.loading}>Loading PDF...</div>}
          error={<div className={styles.error}>Failed to load PDF</div>}
        >
          <div className={styles.pageContainer}>
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className={styles.pdfPage}
            />
            {/* Render clause highlights for current page */}
            {clauses
              .filter(clause => clause.page === pageNumber)
              .map(clause => (
                <div
                  key={clause.id}
                  className={`${styles.clauseHighlight} ${clause.label ? styles[clause.label] : ''}`}
                  style={{
                    top: `${clause.position.top * scale}px`,
                    left: `${clause.position.left * scale}px`,
                    width: `${clause.position.width * scale}px`,
                    height: `${clause.position.height * scale}px`,
                  }}
                  onClick={() => onClauseClick && onClauseClick(clause.id)}
                  title={clause.tags.join(', ')}
                />
              ))}
          </div>
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;