import React, { useState, useEffect, useRef } from 'react';
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
  status: 'analyzed' | 'processing' | 'error' | 'archived';
  clauses: {
    id: string;
    text: string;
    tags: string[];
    label?: 'favorable' | 'unfavorable' | 'harsh' | 'standard provision';
    page: number;
  }[];
  fileUrl?: string;
}

const ClauseList: React.FC<ClauseListProps> = ({ searchQuery, filter }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLSpanElement>(null);
  const [menuPosition, setMenuPosition] = useState<{top: number, left: number}>({top: 0, left: 0});

  // Fetch contracts and clauses (placeholder for API call)
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        
        // Check if we have any real documents in localStorage
        const documentKeys = Object.keys(localStorage).filter(key => key.startsWith('document_'));
        console.log("ClauseList - Document keys in localStorage:", documentKeys);
        
        if (documentKeys.length === 0) {
          // No documents in localStorage
          console.log("ClauseList - No documents found in localStorage");
          setContracts([]);
          setError(null);
          setLoading(false);
          return;
        }
        
        // Load document data from localStorage
        const contractsData: Contract[] = [];
        
        for (const key of documentKeys) {
          try {
            const documentData = JSON.parse(localStorage.getItem(key) || '{}');
            console.log("ClauseList - Loaded document:", documentData);
            
            if (documentData && documentData.fileId) {
              // Create a contract from the document
              const contract: Contract = {
                id: documentData.fileId,
                name: `Contract ${documentData.fileId.substring(0, 8)}`,
                uploadDate: new Date().toISOString().split('T')[0], // Current date
                status: 'analyzed',
                clauses: (documentData.highlightedClauses || documentData.clauses || []).map((clause: any) => ({
                  id: clause.id,
                  text: clause.text,
                  tags: clause.tags || [],
                  label: clause.label,
                  page: clause.page || 1
                })),
                fileUrl: documentData.fileUrl
              };
              
              contractsData.push(contract);
            }
          } catch (e) {
            console.error("ClauseList - Error parsing document:", e);
          }
        }
        
        console.log("ClauseList - Loaded contracts:", contractsData);
        setContracts(contractsData);
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

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  // Handle menu open and positioning
  const handleMenuOpen = (contractId: string, event: React.MouseEvent) => {
    // Toggle the menu
    if (menuOpenId === contractId) {
      setMenuOpenId(null);
      return;
    }
    
    // Get the button's position
    const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    
    // Position the menu to the left of the button
    setMenuPosition({
      top: buttonRect.bottom,
      left: buttonRect.left - 150, // Position menu to the left of button
    });
    
    setMenuOpenId(contractId);
  };

  // Delete contract handler
  const handleDeleteContract = (contractId: string) => {
    if (confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      localStorage.removeItem('document_' + contractId);
      setContracts(contracts.filter(c => c.id !== contractId));
      setMenuOpenId(null);
    }
  };

  // Rename contract handler
  const handleRenameContract = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    const newName = prompt('Enter a new name for this contract:', contract.name);
    if (newName && newName.trim() && newName !== contract.name) {
      // Update in localStorage
      const docKey = 'document_' + contractId;
      const docData = JSON.parse(localStorage.getItem(docKey) || '{}');
      docData.displayName = newName;
      localStorage.setItem(docKey, JSON.stringify(docData));
      // Update in UI
      setContracts(contracts.map(c => c.id === contractId ? { ...c, name: newName } : c));
      setMenuOpenId(null);
    }
  };

  // Archive contract handler
  const handleArchiveContract = (contractId: string) => {
    if (confirm('Are you sure you want to archive this contract?')) {
      // Update in localStorage
      const docKey = 'document_' + contractId;
      const docData = JSON.parse(localStorage.getItem(docKey) || '{}');
      docData.archived = true;
      localStorage.setItem(docKey, JSON.stringify(docData));
      // Update in UI
      setContracts(contracts.map(c => c.id === contractId ? { ...c, status: 'archived' } : c));
      setMenuOpenId(null);
    }
  };

  // Download PDF handler
  const handleDownloadPDF = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    // Try to get fileUrl from localStorage
    const docKey = 'document_' + contractId;
    const docData = JSON.parse(localStorage.getItem(docKey) || '{}');
    const fileUrl = docData.fileUrl || contract.fileUrl;
    if (fileUrl) {
      // Open in new tab or trigger download
      window.open(fileUrl, '_blank');
    } else {
      alert('No PDF file available for download.');
    }
    setMenuOpenId(null);
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
        // Hide archived contracts from main list
        if (contract.status === 'archived') {
          return null;
        }
        return (
          <div key={contract.id} className={styles.contractCard}>
            <div className={styles.contractHeader} onClick={() => toggleContract(contract.id)}>
              <div className={styles.contractInfo}>
                <h3 className={styles.contractName}>{contract.name}</h3>
                <span className={styles.contractDate}>Uploaded: {contract.uploadDate}</span>
              </div>
              <div className={styles.contractRightGroup}>
                <div
                  className={styles.menuWrapper}
                  onClick={e => e.stopPropagation()}
                >
                  <span
                    className={styles.menuButton}
                    onClick={(e) => handleMenuOpen(contract.id, e)}
                    title="Contract actions"
                    ref={buttonRef}
                    style={{ cursor: 'pointer', fontSize: '22px', userSelect: 'none', marginRight: '24px' }}
                  >
                    &#8943;
                  </span>
                  {menuOpenId === contract.id && (
                    <div 
                      className={styles.menuDropdown} 
                      ref={menuRef} 
                      style={{ 
                        top: `${menuPosition.top}px`, 
                        left: `${menuPosition.left}px`,
                      }}
                    >
                      <button
                        className={styles.menuItem}
                        onClick={() => handleRenameContract(contract.id)}
                      >
                        Rename Contract
                      </button>
                      <button
                        className={styles.menuItem}
                        onClick={() => handleArchiveContract(contract.id)}
                      >
                        Archive Contract
                      </button>
                      <button
                        className={styles.menuItem}
                        onClick={() => handleDownloadPDF(contract.id)}
                      >
                        Download PDF
                      </button>
                      <button
                        className={styles.menuItem}
                        onClick={() => handleDeleteContract(contract.id)}
                      >
                        Delete Contract
                      </button>
                    </div>
                  )}
                </div>
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