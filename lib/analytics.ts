/**
 * Analytics utility for tracking events in the application
 * Uses Google Analytics 4 for event tracking
 */

// Type definitions for tracking events
export interface TrackingEvent {
    action: string;
    category: string;
    label?: string;
    value?: number;
    [key: string]: any;
  }
  
  /**
   * Initialize Google Analytics
   * This is called in _app.tsx when the application loads
   */
  export function initializeGA(): void {
    if (typeof window === 'undefined') return;
    
    // Check if GA is already initialized
    if (typeof window.gtag === 'function') return;
    
    // Load GA script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`;
    script.async = true;
    document.head.appendChild(script);
    
    // Initialize GA
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', process.env.NEXT_PUBLIC_GA4_ID);
  }
  
  /**
   * Track a page view in Google Analytics
   * @param url The URL of the page being viewed
   */
  export function trackPageView(url: string): void {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    window.gtag('config', process.env.NEXT_PUBLIC_GA4_ID, {
      page_path: url,
    });
  }
  
  /**
   * Track a custom event in Google Analytics
   * @param event The event to track
   */
  export function trackEvent(event: TrackingEvent): void {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    // Create event parameters
    const eventParams: Record<string, any> = {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    };
    
    // Add any additional parameters
    Object.keys(event).forEach(key => {
      if (!['action', 'category', 'label', 'value'].includes(key)) {
        eventParams[key] = event[key];
      }
    });
    
    // Send event to GA
    window.gtag('event', event.action, eventParams);
  }
  
  /**
   * Initialize Hotjar
   * Note: This is commented out until Hotjar is configured
   */
  export function initializeHotjar(): void {
    if (typeof window === 'undefined') return;
    
    const hotjarId = process.env.NEXT_PUBLIC_HOTJAR_ID;
    const hotjarSv = process.env.NEXT_PUBLIC_HOTJAR_SV;
    
    if (!hotjarId || !hotjarSv) return;
    
    // Hotjar tracking code
    /* Uncomment when Hotjar is configured
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid: Number(hotjarId), hjsv: Number(hotjarSv)};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    */
  }
  
  /**
   * Track contract upload event
   * @param fileSize Size of the uploaded file in bytes
   * @param fileType Type of the uploaded file
   */
  export function trackContractUpload(fileSize: number, fileType: string): void {
    trackEvent({
      action: 'contract_upload',
      category: 'Contract',
      label: fileType,
      value: Math.round(fileSize / 1024), // Convert to KB
      file_size_kb: Math.round(fileSize / 1024),
      file_type: fileType,
    });
  }
  
  /**
   * Track clause analysis event
   * @param fileId ID of the analyzed file
   * @param clauseCount Number of clauses extracted
   */
  export function trackClauseAnalysis(fileId: string, clauseCount: number): void {
    trackEvent({
      action: 'clause_analysis',
      category: 'Analysis',
      label: fileId,
      value: clauseCount,
      clause_count: clauseCount,
    });
  }
  
  /**
   * Track summary generation event
   * @param fileId ID of the summarized file
   * @param summaryType Type of summary generated (simple or deep)
   */
  export function trackSummaryGeneration(fileId: string, summaryType: 'simple' | 'deep'): void {
    trackEvent({
      action: 'summary_generation',
      category: 'Analysis',
      label: `${summaryType}_summary`,
      summary_type: summaryType,
      file_id: fileId,
    });
  }
  
  /**
   * Track clause labeling event
   * @param clauseId ID of the labeled clause
   * @param label The label applied to the clause
   */
  export function trackClauseLabel(clauseId: string, label: string): void {
    trackEvent({
      action: 'clause_label',
      category: 'Interaction',
      label: label,
      clause_id: clauseId,
    });
  }
  
  export default {
    initializeGA,
    trackPageView,
    trackEvent,
    initializeHotjar,
    trackContractUpload,
    trackClauseAnalysis,
    trackSummaryGeneration,
    trackClauseLabel,
  };
  
  // Add type definition for window object to include gtag
  declare global {
    interface Window {
      gtag: (...args: any[]) => void;
      dataLayer: any[];
    }
  }