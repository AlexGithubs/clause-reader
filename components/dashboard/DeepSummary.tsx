import React, { useState, useEffect } from 'react';
import styles from '@/styles/Dashboard.module.css';

interface DeepSummaryProps {
  searchQuery: string;
  filter: {
    tag: string;
    label: string;
    length: string;
  };
}

interface DeepSummaryData {
  fileId: string;
  analysis: string;
  recommendations: string;
  riskAssessment: {
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
  };
  detailedClauses: {
    id: string;
    text: string;
    tags: string[];
    label?: 'good' | 'bad' | 'harsh' | 'free';
    explanation?: string;
  }[];
}

const DeepSummary: React.FC<DeepSummaryProps> = ({ searchQuery, filter }) => {
  const [summaryData, setSummaryData] = useState<DeepSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'recommendations' | 'risk'>('analysis');

  // Fetch deep summary data (placeholder for API call)
  useEffect(() => {
    const fetchDeepSummary = async () => {
      try {
        setLoading(true);
        
        // In a real application, this would be a call to the API
        // const response = await fetch('/api/summarize-deep');
        // const data = await response.json();
        
        // Mock data for development
        const mockData: DeepSummaryData = {
          fileId: '123',
          analysis: 'This contract contains several provisions that warrant careful consideration. The indemnification clause (Clause 1) is particularly problematic as it places all liability on the customer without any limitations or exclusions. The payment terms (Clause 3) are also more stringent than industry standards, requiring payment within 15 days and imposing a 10% monthly interest rate, which is significantly higher than typical late fees. On the positive side, the termination clause (Clause 2) is balanced and provides reasonable notice periods for both parties.',
          recommendations: 'Recommended changes:\n\n1. Negotiate the indemnification clause to include limitations or make it mutual. Suggest language like: "Each party agrees to indemnify the other for claims arising from their own negligence or willful misconduct."\n\n2. Extend payment terms to net 30 days and reduce the late payment interest to 1.5-2% monthly, which is more aligned with industry standards.\n\n3. Add a dispute resolution mechanism, such as mandatory mediation before litigation.\n\n4. Consider adding a limitation of liability clause capping damages to fees paid or a reasonable multiple.',
          riskAssessment: {
            riskScore: 65,
            riskLevel: 'High',
            riskAreas: ['liability', 'payment', 'indemnification'],
            clauseBreakdown: {
              good: 1,
              bad: 1,
              harsh: 1,
              free: 0,
              unlabeled: 0
            }
          },
          detailedClauses: [
            {
              id: '1',
              text: 'The Customer agrees to indemnify and hold harmless the Provider from any claims, damages, or expenses arising from the Customer\'s use of the service.',
              tags: ['liability', 'indemnification'],
              label: 'harsh',
              explanation: 'This clause places all liability on the customer without any limitations or exclusions. This is extremely one-sided and could expose the customer to significant financial risk. Most balanced contracts either have mutual indemnification or include reasonable limitations.'
            },
            {
              id: '2',
              text: 'Either party may terminate this agreement with 30 days written notice.',
              tags: ['termination'],
              label: 'good',
              explanation: 'This is a fair and balanced termination clause that gives both parties equal rights to end the agreement with reasonable notice. The 30-day period is standard in the industry and provides adequate time for transition.'
            },
            {
              id: '3',
              text: 'Payment terms are net 15 days from invoice date. Late payments will incur a 10% monthly interest charge.',
              tags: ['payment', 'terms'],
              label: 'bad',
              explanation: 'The payment terms are notably strict compared to industry standards. Most contracts allow 30 days for payment, and late fees are typically 1.5-2% monthly. The 10% monthly interest rate could be viewed as punitive and might not be enforceable in some jurisdictions.'
            }
          ]
        };
        
        setSummaryData(mockData);
        setError(null);
      } catch (err) {
        console.error('Error fetching deep summary:', err);
        setError('Failed to load deep analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchDeepSummary();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading deep analysis...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!summaryData) {
    return <div className={styles.empty}>No analysis data available.</div>;
  }

  return (
    <div className={styles.deepSummaryContainer}>
      <div className={styles.summaryHeader}>
        <h2>Deep Analysis</h2>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'recommendations' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            Recommendations
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'risk' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('risk')}
          >
            Risk Assessment
          </button>
        </div>
      </div>
      
      <div className={styles.tabContent}>
        {activeTab === 'analysis' && (
          <div className={styles.analysisContent}>
            <h3>Comprehensive Analysis</h3>
            <p className={styles.analysisText}>{summaryData.analysis}</p>
            
            <h3>Detailed Clause Analysis</h3>
            <div className={styles.detailedClauses}>
              {summaryData.detailedClauses
                .filter(clause => {
                  // Apply filters
                  if (searchQuery && !clause.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return false;
                  }
                  if (filter.tag && !clause.tags.includes(filter.tag)) {
                    return false;
                  }
                  if (filter.label && clause.label !== filter.label) {
                    return false;
                  }
                  return true;
                })
                .map(clause => (
                  <div key={clause.id} className={`${styles.detailedClauseCard} ${clause.label ? styles[clause.label] : ''}`}>
                    <div className={styles.clauseHeader}>
                      <div className={styles.clauseTags}>
                        {clause.tags.map((tag, index) => (
                          <span key={index} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                      {clause.label && (
                        <span className={`${styles.labelTag} ${styles[clause.label]}`}>
                          {clause.label}
                        </span>
                      )}
                    </div>
                    <p className={styles.clauseText}>{clause.text}</p>
                    {clause.explanation && (
                      <div className={styles.clauseExplanation}>
                        <h4>Analysis:</h4>
                        <p>{clause.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {activeTab === 'recommendations' && (
          <div className={styles.recommendationsContent}>
            <h3>Recommended Changes</h3>
            <div className={styles.recommendationsList}>
              {summaryData.recommendations.split('\n\n').map((rec, index) => (
                <div key={index} className={styles.recommendation}>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'risk' && (
          <div className={styles.riskContent}>
            <div className={styles.riskScore}>
              <h3>Overall Risk Level: {summaryData.riskAssessment.riskLevel}</h3>
              <div className={styles.riskMeter}>
                <div 
                  className={styles.riskIndicator} 
                  style={{ width: `${summaryData.riskAssessment.riskScore}%` }}
                >
                  {summaryData.riskAssessment.riskScore}%
                </div>
              </div>
              <div className={styles.riskLabels}>
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
                <span>Extreme</span>
              </div>
            </div>
            
            <div className={styles.riskBreakdown}>
              <h3>Clause Breakdown</h3>
              <div className={styles.breakdownChart}>
                <div className={styles.goodBar} style={{ width: `${(summaryData.riskAssessment.clauseBreakdown.good / 3) * 100}%` }}>
                  Good: {summaryData.riskAssessment.clauseBreakdown.good}
                </div>
                <div className={styles.badBar} style={{ width: `${(summaryData.riskAssessment.clauseBreakdown.bad / 3) * 100}%` }}>
                  Bad: {summaryData.riskAssessment.clauseBreakdown.bad}
                </div>
                <div className={styles.harshBar} style={{ width: `${(summaryData.riskAssessment.clauseBreakdown.harsh / 3) * 100}%` }}>
                  Harsh: {summaryData.riskAssessment.clauseBreakdown.harsh}
                </div>
              </div>
            </div>
            
            <div className={styles.riskAreas}>
              <h3>Key Risk Areas</h3>
              <div className={styles.riskTags}>
                {summaryData.riskAssessment.riskAreas.map((area, index) => (
                  <span key={index} className={styles.riskTag}>{area}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepSummary;