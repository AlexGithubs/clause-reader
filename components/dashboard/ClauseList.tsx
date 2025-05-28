import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '@/styles/Dashboard.module.css';
import { useAuth } from '@/components/auth/AuthContext';

interface Clause {
  id: string;
  text: string;
  tags: string[];
  label: string;
  page: number;
}

interface Contract {
  id: string;
  name: string;
  uploadDate: string;
  status: 'analyzed' | 'processing' | 'error';
  clauses: Clause[];
  fileUrl?: string;
}

interface ClauseListProps {
  searchQuery: string;
  filter: {
    tag: string;
    label: string;
    length: string;
  };
}

const ClauseList: React.FC<ClauseListProps> = ({ searchQuery, filter }) => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLSpanElement>(null);
  const [menuPosition, setMenuPosition] = useState<{top: number, left: number}>({top: 0, left: 0});

  // Fetch contracts and clauses from database
  useEffect(() => {
    const fetchContracts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        console.log(`ClauseList - Fetching documents for user: ${user.id}`);
        
        // Fetch user documents from database
        const response = await fetch(`/api/user-documents?userId=${user.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch documents');
        }
        
        const data = await response.json();
        const documents = data.documents || [];
        
        console.log(`ClauseList - Loaded ${documents.length} documents from database`);
        
        if (documents.length === 0) {
          setContracts([]);
          setError(null);
          setLoading(false);
          return;
        }
        
        // Transform documents to contracts format
        const contractsData: Contract[] = documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          uploadDate: new Date(doc.created_at).toISOString().split('T')[0],
          status: doc.status === 'completed' ? 'analyzed' : doc.status,
          clauses: (doc.clauses || []).map((clause: any) => ({
            id: clause.id,
            text: clause.text,
            tags: clause.tags || [],
            label: clause.label,
            page: clause.page || 1
          })),
          fileUrl: doc.file_path // This would be the Supabase storage path
        }));
        
        console.log(`ClauseList - Transformed contracts:`, contractsData);
        setContracts(contractsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching contracts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load contracts');
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [user]);

  const toggleContract = (contractId: string) => {
    if (expandedContract === contractId) {
      setExpandedContract(null);
    } else {
      setExpandedContract(contractId);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
  const handleDeleteContract = async (contractId: string) => {
    if (confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      try {
        // TODO: Implement API call to delete contract from database
        // For now, just remove from local state
        setContracts(contracts.filter(c => c.id !== contractId));
        setMenuOpenId(null);
        
        // You would call something like:
        // await fetch(`/api/documents/${contractId}`, { method: 'DELETE' });
        
      } catch (error) {
        console.error('Error deleting contract:', error);
        alert('Failed to delete contract. Please try again.');
      }
    }
  };

  // Rename contract handler
  const handleRenameContract = async (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    
    const newName = prompt('Enter a new name for this contract:', contract.name);
    if (newName && newName.trim() && newName !== contract.name) {
      try {
        // TODO: Implement API call to update contract name in database
        // For now, just update local state
        setContracts(contracts.map(c => c.id === contractId ? { ...c, name: newName } : c));
        setMenuOpenId(null);
        
        // You would call something like:
        // await fetch(`/api/documents/${contractId}`, { 
        //   method: 'PATCH', 
        //   body: JSON.stringify({ name: newName }) 
        // });
        
      } catch (error) {
        console.error('Error renaming contract:', error);
        alert('Failed to rename contract. Please try again.');
      }
    }
  };

  // Archive contract handler
  const handleArchiveContract = async (contractId: string) => {
    if (confirm('Are you sure you want to archive this contract?')) {
      try {
        // TODO: Implement API call to archive contract in database
        // For now, just update local state
        setContracts(contracts.map(c => c.id === contractId ? { ...c, status: 'archived' as any } : c));
        setMenuOpenId(null);
        
        // You would call something like:
        // await fetch(`/api/documents/${contractId}`, { 
        //   method: 'PATCH', 
        //   body: JSON.stringify({ status: 'archived' }) 
        // });
        
      } catch (error) {
        console.error('Error archiving contract:', error);
        alert('Failed to archive contract. Please try again.');
      }
    }
  };

  // Download PDF handler
  const handleDownloadPDF = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    
    if (contract.fileUrl) {
      // Open the Supabase storage URL in new tab
      window.open(contract.fileUrl, '_blank');
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
      
      {contracts.map(contract => (
        <div key={contract.id} className={styles.contractCard}>
          <div className={styles.contractHeader} onClick={() => toggleContract(contract.id)}>
            <div className={styles.contractInfo}>
              <h3 className={styles.contractName}>{contract.name}</h3>
              <p className={styles.contractDate}>Uploaded: {contract.uploadDate}</p>
            </div>
            
            <div className={styles.contractActions}>
              <span className={`${styles.contractStatus} ${styles[contract.status]}`}>
                {contract.status}
              </span>
              
              <Link href={`/contract/${contract.id}`} className={styles.viewLink}>
                View Contract
              </Link>
              
              <span 
                ref={buttonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(contract.id, e);
                }}
                style={{ cursor: 'pointer', fontSize: '20px', padding: '5px' }}
                title="More options"
              >
                ⋮
              </span>
              
              {menuOpenId === contract.id && (
                <div 
                  ref={menuRef}
                  style={{
                    position: 'fixed',
                    top: menuPosition.top,
                    left: menuPosition.left,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '150px'
                  }}
                >
                  <div style={{ padding: '8px 0' }}>
                    <button
                      onClick={() => handleRenameContract(contract.id)}
                      style={{ 
                        width: '100%', 
                        padding: '8px 16px', 
                        border: 'none', 
                        background: 'none', 
                        textAlign: 'left', 
                        cursor: 'pointer' 
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(contract.id)}
                      style={{ 
                        width: '100%', 
                        padding: '8px 16px', 
                        border: 'none', 
                        background: 'none', 
                        textAlign: 'left', 
                        cursor: 'pointer' 
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => handleArchiveContract(contract.id)}
                      style={{ 
                        width: '100%', 
                        padding: '8px 16px', 
                        border: 'none', 
                        background: 'none', 
                        textAlign: 'left', 
                        cursor: 'pointer' 
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => handleDeleteContract(contract.id)}
                      style={{ 
                        width: '100%', 
                        padding: '8px 16px', 
                        border: 'none', 
                        background: 'none', 
                        textAlign: 'left', 
                        cursor: 'pointer',
                        color: 'red'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {expandedContract === contract.id && (
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <h4>Clauses ({contract.clauses.length})</h4>
              {contract.clauses.length === 0 ? (
                <p>No clauses found for this contract.</p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {contract.clauses
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
                      <div key={clause.id} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          {clause.tags.map((tag, index) => (
                            <span key={index} style={{ 
                              backgroundColor: '#f3f4f6', 
                              padding: '2px 6px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              marginRight: '4px' 
                            }}>
                              {tag}
                            </span>
                          ))}
                          <span style={{ 
                            backgroundColor: clause.label === 'favorable' ? '#10b981' : 
                                           clause.label === 'unfavorable' ? '#f59e0b' : 
                                           clause.label === 'harsh' ? '#ef4444' : '#6b7280',
                            color: 'white',
                            padding: '2px 6px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem',
                            marginLeft: '4px'
                          }}>
                            {clause.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>{clause.text}</p>
                        <small style={{ color: '#6b7280' }}>Page {clause.page}</small>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ClauseList;