import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Clause } from '../../lib/types';
import styles from '../../styles/PDFViewer.module.css';
import ClauseHighlighter from './ClauseHighlighter';

// Fix TextLayer and AnnotationLayer warnings
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

// Use locally hosted PDF.js worker with the exact version needed by react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.js/pdf.worker.min.js`;

// Don't try to set version - it's read-only

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface PDFViewerProps {
  pdfData: string | null;
  fullText: string;
  clauses?: {
    id: string;
    text: string;
    position: {
      pageNumber: number;
      boundingBox?: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      }
    };
    tags?: string[];
    label?: 'favorable' | 'unfavorable' | 'harsh' | 'standard provision';
    explanation?: string;
  }[];
  onClauseClick?: (clauseId: string) => void;
  selectedClauseId?: string | null;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfData,
  fullText,
  clauses = [],
  onClauseClick,
  selectedClauseId,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);
  
  const [selectedClauseDetails, setSelectedClauseDetails] = useState<{
    text: string;
    tags?: string[];
    label?: string;
  } | null>(null);

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
  
  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setIsSidebarOpen(false);
    }
  }
  
  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen);
  }
  
  const handleClauseClick = useCallback((clauseId: string) => {
    if (onClauseClick) {
      onClauseClick(clauseId);
    }
    
    const clickedClause = clauses.find(clause => clause.id === clauseId);
    if (clickedClause) {
      setSelectedClauseDetails({
        text: clickedClause.text,
        tags: clickedClause.tags,
        label: clickedClause.label
      });
      
      if (isFullscreen) {
        setIsSidebarOpen(true);
      }
    }
  }, [clauses, onClauseClick, isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const renderClauseHighlights = (pageIndex: number) => {
    console.log(`PDFViewer: [Page ${pageIndex}] Rendering highlights. Total clauses received: ${clauses.length}`);
    // Log all clauses with positions before filtering for this page
    clauses.forEach(c => {
        if (c.position) {
            console.log(`PDFViewer: [Page ${pageIndex}] Pre-filter check: Clause ${c.id}, Page ${c.position.pageNumber}, Pos: ${JSON.stringify(c.position.boundingBox)}`);
        } else {
            console.log(`PDFViewer: [Page ${pageIndex}] Pre-filter check: Clause ${c.id} has no position.`);
        }
    });

    const pageHighlights = clauses.filter(
      clause => clause.position && clause.position.pageNumber === pageIndex
    );
    
    console.log(`PDFViewer: [Page ${pageIndex}] Filter result: Found ${pageHighlights.length} clauses for this page.`);

    // --- Filter out highlights that are too small vertically --- 
    const MIN_HIGHLIGHT_HEIGHT = 20; // Minimum pixels
    const highlightsToRender = pageHighlights.filter(clause => {
      if (!clause.position?.boundingBox) return false;
      const { y1, y2 } = clause.position.boundingBox;
      const scaledHeight = (y2 - y1) * scale; // Calculate scaled height (base, before adjustments)
      return scaledHeight >= MIN_HIGHLIGHT_HEIGHT;
    });

    console.log(`PDFViewer: [Page ${pageIndex}] Rendering ${highlightsToRender.length} highlights after filtering small ones.`);

    // Define highlight colors based on label (use solid colors, opacity controlled below)
    const labelColors = {
      favorable: 'rgb(0, 255, 0)',   // Green
      unfavorable: 'rgb(255, 99, 71)',   // Tomato Red (less intense)
      harsh: 'rgb(255, 190, 80)',   // Less intense Orange
      'standard provision': 'rgb(173, 216, 230)' // Light blue
    };

    return highlightsToRender.map((clause) => {
      // Added extra check just in case, though filter should handle it.
      if (!clause.position?.boundingBox) {
          console.warn(`PDFViewer: [Page ${pageIndex}] Clause ${clause.id} made it past filter but lacks boundingBox!`);
          return null;
      }
      
      const { x1, y1, x2, y2 } = clause.position.boundingBox;
      const isSelected = clause.id === selectedClauseId;

      // Calculate scaled dimensions
      let scaledWidth = (x2 - x1) * scale;
      let baseScaledHeight = (y2 - y1) * scale;

      // Calculate adjusted scaled position and size
      const scaledLeft = x1 * scale;
      const scaledTop = (y1 * scale) - 8; // Move up by 8px
      const scaledHeight = baseScaledHeight + 4; // Increase height slightly

      const highlightStyle: React.CSSProperties = {
        left: `${scaledLeft}px`,
        top: `${scaledTop}px`,
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        zIndex: 100, // Ensure highlight is above page content
        // Apply slightly lower opacity specifically for harsh label
        opacity: isSelected 
          ? (clause.label === 'harsh' ? 0.6 : 0.7) 
          : (clause.label === 'harsh' ? 0.4 : 0.5),
        border: 'none', // Remove border entirely
        backgroundColor: clause.label && clause.label in labelColors ? labelColors[clause.label as keyof typeof labelColors] : 'rgb(200, 200, 200)', // Use solid fallback color
        position: 'absolute',
        pointerEvents: 'auto',
        cursor: 'pointer', // Indicate interactivity
        borderRadius: '2px', // Slight rounding
        transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out' // Smooth transition
      };
      
      // Build tooltip content
      let tooltipLines: string[] = [];
      if (clause.label) {
        tooltipLines.push(`Label: ${clause.label.toUpperCase().replace(' ', '-')}`);
      }
      if (clause.tags && clause.tags.length > 0) {
        tooltipLines.push(`Tags: ${clause.tags.join(', ')}`);
      }
      if (clause.explanation) {
        tooltipLines.push(`Explanation: ${clause.explanation}`);
      }
      const tooltipContent = tooltipLines.join(' | ');
      
      return (
        <div
          key={clause.id}
          className={styles.clauseHighlight} // Use common class, styling driven by style prop
          style={highlightStyle}
          onClick={() => handleClauseClick(clause.id)}
          title={tooltipContent}
        >
        </div>
      );
    });
  };

  const getContainerClassName = () => {
    if (isFullscreen) {
      return styles.fullscreenContainer;
    }
    return styles.pdfContainer;
  };
  
  const getWrapperClassName = () => {
    if (isFullscreen) {
      return styles.fullscreenWrapper;
    }
    return styles.pdfWrapper;
  };
  
  const getTextViewClassName = () => {
    if (isFullscreen) {
      return `${styles.fullscreenTextView} ${!isSidebarOpen ? styles.withoutSidebar : ''}`;
    }
    return styles.textViewContainer;
  };

  return (
    <div className={getContainerClassName()} ref={pdfContainerRef}>
      <div className={isFullscreen ? styles.fullscreenToolbar : styles.pdfControls}>
        <div className={isFullscreen ? styles.fullscreenToolbarLeft : styles.pageControls}>
            <>
            <button className={styles.pageButton} onClick={goToPreviousPage} disabled={pageNumber <= 1}>Previous</button>
            <span>Page {pageNumber} of {numPages || '--'}</span>
            <button className={styles.pageButton} onClick={goToNextPage} disabled={!numPages || pageNumber >= numPages}>Next</button>
            <button className={styles.zoomButton} onClick={zoomOut}>-</button>
              <span>{Math.round(scale * 100)}%</span>
            <button className={styles.zoomButton} onClick={zoomIn}>+</button>
            </>
        </div>
        
        <div className={isFullscreen ? styles.fullscreenToolbarRight : styles.viewControls}>
          <button className={isFullscreen ? styles.fullscreenButton : styles.viewModeButton} onClick={toggleFullscreen}>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div className={getWrapperClassName()} ref={pdfWrapperRef}>
          <Document
            file={pdfData ? { data: base64ToUint8Array(pdfData) } : null}
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
              {renderClauseHighlights(pageNumber)}
            </div>
          </Document>
        
        {isFullscreen && isSidebarOpen && (
          <div className={styles.fullscreenSidebar}>
            <div className={styles.sidebarHeader}>
              <h3>Clause Details</h3>
              <button className={styles.closeSidebar} onClick={() => setIsSidebarOpen(false)}>
                ×
              </button>
            </div>
            
            {selectedClauseDetails ? (
              <>
                {selectedClauseDetails.tags && selectedClauseDetails.tags.length > 0 && (
                  <div>
                    <strong>Tags:</strong>
                    <div className={styles.clauseTags}>
                      {selectedClauseDetails.tags.map((tag, index) => (
                        <span key={index} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedClauseDetails.label && (
                  <div className={`${styles.labelBadge} ${styles[selectedClauseDetails.label.replace(' ', '-')]}`}>
                    {selectedClauseDetails.label}
                  </div>
                )}
                
                <div className={styles.clauseText}>
                  {selectedClauseDetails.text}
                </div>
              </>
            ) : (
              <p>Select a clause to view details</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Add a property to the Window interface to avoid TypeScript errors
declare global {
  interface Window {
    handleClauseClick: (clauseId: string) => void;
  }
}

export default PDFViewer;