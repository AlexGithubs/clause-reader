import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/Dashboard.module.css';

interface ClauseListProps {
  searchQuery: string;
  filter: {
    tag: string;
    label: string;
    length: string;
  };
}

interface Contract {
  id: string;
  name: string;
  uploadDate: string;
  status: 'analyzed' | 'processing' | 'error';
  clauses: {
    id: string;
    text: string;
    tags: string[];
    label?: 'good' | 'bad' | 'harsh' | 'free';
    page: number;
  }[];
}

const ClauseList: React.FC<ClauseListProps> = ({ searchQuery, filter }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  // Fetch contracts and clauses (placeholder for API call)
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        
        // In a real application, this would be a call to the API
        // const response = await fetch('/api/contracts');
        // const data = await response.json();
        
        // Mock data for development
        const mockData: Contract[] = [
          {
            id: '123',
            name: 'Service Agreement - Acme Corp',
            uploadDate: '2023-04-15',
            status: 'analyzed',
            clauses: [
              {
                id: '1',
                text: 'The Customer agrees to indemnify and hold harmless the Provider from any claims, damages, or expenses arising from the Customer\'s use of the service.',
                tags: ['liability', 'indemnification'],
                label: 'harsh',
                page: 1
              },
              {
                id: '2',
                text: 'Either party may terminate this agreement with 30 days written notice.',
                tags: ['termination'],
                label: 'good',
                page: 1
              },
              {
                id: '3',
                text: 'Payment terms are net 15 days from invoice date. Late payments will incur a 10% monthly interest charge.',
                tags: ['payment', 'terms'],
                label: 'bad',
                page: 2
              }
            ]
          },
          {
            id: '456',
            name: 'NDA - TechStart Inc',
            uploadDate: '2023-04-10',
            status: 'analyzed',
            clauses: [
              {
                id: '1',
                text: 'Confidential information shall include all data, materials, products, technology, specifications, manuals, business plans, software, marketing plans, financial information, and other information disclosed or submitted by either party to the other.',
                tags: ['confidentiality', 'definition'],
                label: 'good',
                page: 1
              },
              {
                id: '2',
                text: 'The receiving party shall hold and maintain the confidential information in strictest confidence for the sole and exclusive benefit of the disclosing party.',
                tags: ['confidentiality', 'obligation'],
                label: 'good',
                page: 1
              },
              {
                id: '3',
                text: 'This agreement shall remain in effect for 5 years from the date of signing.',
                tags: ['term'],
                label: 'free',
                page: 2
              }
            ]
          }
        ];
        
        setContracts(mockData);
        setError(null);
      } catch (err) {
        console.error('Error fetching contracts:', err);
        setError('Failed to load contracts');
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const toggleContract = (contractId: string) => {
    if (expandedContract === contractId) {
      setExpandedContract(null);
    } else {
      setExpandedContract(contractId);
    }
  };

  // Filter clauses based on search and filters
  const getFilteredClauses = (contract: Contract) => {
    return contract.clauses.filter(clause => {
      // Apply text search
      if (searchQuery && !clause.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Apply tag filter
      if (filter.tag && !clause.tags.includes(filter.tag)) {
        return false;
      }
      
      // Apply label filter
      if (filter.label && clause.label !== filter.label) {
        return false;
      }
      
      // Apply length filter
      if (filter.length) {
        const wordCount = clause.text.split(' ').length;
        if (filter.length === 'short' && wordCount >= 20) {
          return false;
        }
        if (filter.length === 'medium' && (wordCount < 20 || wordCount >= 50)) {
          return false;
        }
        if (filter.length === 'long' && wordCount < 50) {
          return false;
        }
      }
      
      return true;
    });
  };

  if (loading) {
    return <div className={styles.loading}>Loading contracts...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (contracts.length === 0) {
    return (
      <div className={styles.emptyContracts}>
        <p>No contracts found. Upload your first contract to get started.</p>
        <Link href="/upload" className={styles.uploadButton}>
          Upload Contract
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.contractsContainer}>
      <h2 className={styles.contractsTitle}>Your Contracts</h2>
      
      {contracts.map(contract => {
        const filteredClauses = getFilteredClauses(contract);
        const isExpanded = expandedContract === contract.id;
        
        // Skip contracts with no matching clauses when filters are applied
        if ((searchQuery || filter.tag || filter.label || filter.length) && filteredClauses.length === 0) {
          return null;
        }
        
        return (
          <div key={contract.id} className={styles.contractCard}>
            <div 
              className={styles.contractHeader} 
              onClick={() => toggleContract(contract.id)}
            >
              <div className={styles.contractInfo}>
                <h3 className={styles.contractName}>{contract.name}</h3>
                <span className={styles.contractDate}>Uploaded: {contract.uploadDate}</span>
              </div>
              
              <div className={styles.contractActions}>
                <span className={`${styles.contractStatus} ${styles[contract.status]}`}>
                  {contract.status === 'analyzed' && 'Analyzed'}
                  {contract.status === 'processing' && 'Processing'}
                  {contract.status === 'error' && 'Error'}
                </span>
                
                <span className={styles.expandIcon}>
                  {isExpanded ? '▼' : '►'}
                </span>
              </div>
            </div>
            
            {isExpanded && (
              <div className={styles.clausesTable}>
                {filteredClauses.length === 0 ? (
                  <p className={styles.noClausesMessage}>
                    No clauses match the current filters.
                  </p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Tags</th>
                        <th>Clause</th>
                        <th>Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClauses.map(clause => (
                        <tr key={clause.id} className={styles.clauseRow}>
                          <td className={styles.clausePage}>{clause.page}</td>
                          <td className={styles.clauseTags}>
                            {clause.tags.map((tag, index) => (
                              <span key={index} className={styles.tag}>{tag}</span>
                            ))}
                          </td>
                          <td className={styles.clauseText}>
                            {clause.text.substring(0, 100)}
                            {clause.text.length > 100 ? '...' : ''}
                          </td>
                          <td className={styles.clauseLabel}>
                            {clause.label && (
                              <span className={`${styles.labelBadge} ${styles[clause.label]}`}>
                                {clause.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                
                <div className={styles.contractFooter}>
                  <Link href={`/contract/${contract.id}`} className={styles.viewLink}>
                    View Full Contract
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ClauseList;