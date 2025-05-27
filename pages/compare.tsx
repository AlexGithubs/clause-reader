import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import SplitPaneView from '@/components/comparison/SplitPaneView';
import DiffViewer from '@/components/comparison/DiffViewer';
import styles from '@/styles/Comparison.module.css';

interface ContractData {
  id: string;
  name: string;
  clauses: any[];
  text: string;
  riskScore: number;
}

const Compare: NextPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { base, revised } = router.query;
  
  const [baseContract, setBaseContract] = useState<ContractData | null>(null);
  const [revisedContract, setRevisedContract] = useState<ContractData | null>(null);
  const [riskDelta, setRiskDelta] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'visual' | 'text'>('visual');
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load contract data
  useEffect(() => {
    const fetchContractData = async () => {
      if (!base || !revised) return;
      
      setIsLoadingContracts(true);
      
      try {
        // In a real implementation, these would be API calls
        // const baseResponse = await fetch(`/api/contracts/${base}`);
        // const revisedResponse = await fetch(`/api/contracts/${revised}`);
        
        // Mock data for development
        const mockBaseContract: ContractData = {
          id: base as string,
          name: 'Original Contract',
          clauses: [
            {
              id: '1',
              text: 'The Customer agrees to indemnify and hold harmless the Provider from any claims.',
              page: 1,
              position: { top: 100, left: 50, width: 500, height: 30 },
              tags: ['liability'],
              label: 'harsh',
              explanation: "While standard, the list of events could be broader. Suggest adding 'epidemics, pandemics, labor disputes'."
            },
            {
              id: '2',
              text: 'Either party may terminate this agreement with 30 days written notice.',
              page: 1,
              position: { top: 150, left: 50, width: 500, height: 30 },
              tags: ['termination'],
              label: 'favorable',
              explanation: "Clear termination clause favorable to the Customer."
            }
          ],
          text: 'This is the original contract text.\n\nThe Customer agrees to indemnify and hold harmless the Provider from any claims.\n\nEither party may terminate this agreement with 30 days written notice.',
          riskScore: 65
        };
        
        const mockRevisedContract: ContractData = {
          id: revised as string,
          name: 'Revised Contract',
          clauses: [
            {
              id: '1',
              text: 'Each party agrees to indemnify the other for claims arising from their own negligence.',
              page: 1,
              position: { top: 100, left: 50, width: 500, height: 30 },
              tags: ['liability'],
              label: 'favorable',
              explanation: "Clear indemnification clause favorable to both parties."
            },
            {
              id: '2',
              text: 'Either party may terminate this agreement with 30 days written notice.',
              page: 1,
              position: { top: 150, left: 50, width: 500, height: 30 },
              tags: ['termination'],
              label: 'favorable',
              explanation: "Clear termination clause favorable to the Customer."
            },
            {
              id: '3',
              text: 'All disputes shall be resolved through binding arbitration.',
              page: 2,
              position: { top: 100, left: 50, width: 500, height: 30 },
              tags: ['disputes'],
              label: 'standard provision',
              explanation: "Standard dispute resolution clause. Meets basic expectations."
            }
          ],
          text: 'This is the revised contract text.\n\nEach party agrees to indemnify the other for claims arising from their own negligence.\n\nEither party may terminate this agreement with 30 days written notice.\n\nAll disputes shall be resolved through binding arbitration.',
          riskScore: 40
        };
        
        setBaseContract(mockBaseContract);
        setRevisedContract(mockRevisedContract);
        
        // Calculate risk delta
        setRiskDelta(mockRevisedContract.riskScore - mockBaseContract.riskScore);
      } catch (error) {
        console.error('Error fetching contract data:', error);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    if (base && revised) {
      fetchContractData();
    }
  }, [base, revised]);

  // Handle page sync between both PDFs
  const handlePageSync = (pageNumber: number) => {
    // In a real implementation, this would update the page number in both PDFs
    console.log('Syncing to page', pageNumber);
  };

  if (isLoading || !user) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (isLoadingContracts) {
    return <div className={styles.loading}>Loading contracts...</div>;
  }

  if (!baseContract || !revisedContract) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Compare Contracts | Clause Reader</title>
        </Head>
        
        <div className={styles.errorMessage}>
          <p>Could not load the specified contracts. Please check the contract IDs and try again.</p>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Compare Contracts | Clause Reader</title>
      </Head>
      
      <div className={styles.header}>
        <h1 className={styles.title}>Contract Comparison</h1>
        
        <div className={styles.riskIndicator}>
          Risk {riskDelta < 0 ? '↓' : '↑'} 
          <span className={riskDelta < 0 ? styles.riskImproved : styles.riskWorsened}>
            {Math.abs(riskDelta)}%
          </span>
        </div>
      </div>
      
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'visual' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('visual')}
        >
          Visual Comparison
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'text' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('text')}
        >
          Text Diff
        </button>
      </div>
      
      <div className={styles.contentContainer}>
        {activeTab === 'visual' && (
          <SplitPaneView
            baseFileId={baseContract.id}
            baseUrl="/sample-contract.pdf" // placeholder URL
            baseClauses={baseContract.clauses}
            revisedFileId={revisedContract.id}
            revisedUrl="/sample-contract.pdf" // placeholder URL
            revisedClauses={revisedContract.clauses}
            onSync={handlePageSync}
          />
        )}
        
        {activeTab === 'text' && (
          <DiffViewer
            baseText={baseContract.text}
            revisedText={revisedContract.text}
          />
        )}
      </div>
      
      <div className={styles.comparisonSummary}>
        <h2 className={styles.summaryTitle}>Key Changes</h2>
        
        <div className={styles.changesGrid}>
          <div className={styles.changeCard}>
            <h3 className={styles.changeTitle}>Indemnification Clause</h3>
            <div className={styles.changeCompare}>
              <div className={styles.changeFrom}>
                <div className={styles.changeLabel}>From (Harsh)</div>
                <p className={styles.changeText}>The Customer agrees to indemnify and hold harmless the Provider from any claims.</p>
              </div>
              <div className={styles.changeTo}>
                <div className={styles.changeLabel}>To (Good)</div>
                <p className={styles.changeText}>Each party agrees to indemnify the other for claims arising from their own negligence.</p>
              </div>
            </div>
          </div>
          
          <div className={styles.changeCard}>
            <h3 className={styles.changeTitle}>Added: Dispute Resolution</h3>
            <div className={styles.changeNew}>
              <p className={styles.changeText}>All disputes shall be resolved through binding arbitration.</p>
              <span className={styles.changeBadge}>Free</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compare;