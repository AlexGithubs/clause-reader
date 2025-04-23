/**
 * Type definitions for the application
 */

// User types
export interface User {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      role: 'admin' | 'standard';
    };
    app_metadata: {
      roles?: string[];
    };
    token?: {
      access_token: string;
      expires_at: number;
    };
  }
  
  // Auth context types
  export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => Promise<void>;
  }
  
  // Clause types
  export type ClauseLabel = 'good' | 'bad' | 'harsh' | 'free';
  
  export interface Clause {
    id: string;
    text: string;
    tags: string[];
    label?: ClauseLabel;
    explanation?: string;
    page?: number;
    position?: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
  }
  
  // Contract types
  export interface Contract {
    id: string;
    name: string;
    uploadDate: string;
    userId: string;
    fileUrl: string;
    status: 'analyzed' | 'processing' | 'error';
    clauses: Clause[];
  }
  
  // Summary types
  export interface SimpleSummary {
    summary: string;
    keyPoints: string[];
    highlightedClauses: Clause[];
  }
  
  export interface RiskAssessment {
    riskScore: number;
    riskLevel: string;
    riskAreas: string[];
    clauseBreakdown: {
      good: number;
      bad: number;
      harsh: number;
      free: number;
      unlabeled: number;
    };
  }
  
  export interface DeepSummary {
    analysis: string;
    recommendations: string;
    riskAssessment: RiskAssessment;
    detailedClauses: Clause[];
  }
  
  // API response types
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
  
  export interface UploadResponse {
    fileId: string;
    message: string;
  }
  
  export interface ExtractResponse {
    fileId: string;
    clauses: Clause[];
  }
  
  export interface SimpleSummaryResponse {
    fileId: string;
    summary: string;
    keyPoints: string[];
    highlightedClauses: Clause[];
  }
  
  export interface DeepSummaryResponse {
    fileId: string;
    analysis: string;
    recommendations: string;
    riskAssessment: RiskAssessment;
    detailedClauses: Clause[];
  }
  
  // Component prop types
  export interface FileUploaderProps {
    onFileChange: (file: File) => void;
    maxSize: number; // in MB
    acceptedTypes: string[];
  }
  
  export interface PDFViewerProps {
    url: string;
    clauses?: Clause[];
    onClauseClick?: (clauseId: string) => void;
  }
  
  export interface ClauseHighlighterProps {
    pdfUrl: string;
    fileId: string;
  }
  
  export interface SummaryProps {
    searchQuery: string;
    filter: {
      tag: string;
      label: string;
      length: string;
    };
  }
  
  export interface DeepSummaryProps {
    searchQuery: string;
    filter: {
      tag: string;
      label: string;
      length: string;
    };
  }
  
  export interface ClauseListProps {
    searchQuery: string;
    filter: {
      tag: string;
      label: string;
      length: string;
    };
  }
  
  export interface AdminOnlyProps {
    children: React.ReactNode;
  }