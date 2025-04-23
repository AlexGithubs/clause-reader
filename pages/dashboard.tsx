import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import Link from 'next/link';
import Summary from '@/components/dashboard/Summary';
import DeepSummary from '@/components/dashboard/DeepSummary';
import ClauseList from '@/components/dashboard/ClauseList';
import styles from '@/styles/Dashboard.module.css';

const Dashboard: NextPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'simple' | 'deep'>('simple');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState({
    tag: '',
    label: '',
    length: ''
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Dashboard | Clause Reader</title>
      </Head>

      <div className={styles.header}>
        <h1 className={styles.title}>Your Contracts</h1>
        <Link href="/upload" className={styles.uploadButton}>
          Upload New Contract
        </Link>
      </div>

      <div className={styles.viewToggle}>
        <button 
          className={`${styles.toggleButton} ${viewMode === 'simple' ? styles.active : ''}`}
          onClick={() => setViewMode('simple')}
        >
          Simple Summary
        </button>
        <button 
          className={`${styles.toggleButton} ${viewMode === 'deep' ? styles.active : ''}`}
          onClick={() => setViewMode('deep')}
        >
          Deep Analysis
        </button>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search clauses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        
        <select 
          value={filter.tag} 
          onChange={(e) => setFilter({...filter, tag: e.target.value})}
          className={styles.filterSelect}
        >
          <option value="">All Tags</option>
          <option value="liability">Liability</option>
          <option value="termination">Termination</option>
          <option value="payment">Payment</option>
          <option value="confidentiality">Confidentiality</option>
        </select>
        
        <select 
          value={filter.label} 
          onChange={(e) => setFilter({...filter, label: e.target.value})}
          className={styles.filterSelect}
        >
          <option value="">All Labels</option>
          <option value="good">Good</option>
          <option value="bad">Bad</option>
          <option value="harsh">Harsh</option>
          <option value="free">Free</option>
        </select>
        
        <select 
          value={filter.length} 
          onChange={(e) => setFilter({...filter, length: e.target.value})}
          className={styles.filterSelect}
        >
          <option value="">All Lengths</option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>

      {/* Conditional rendering based on view mode */}
      {viewMode === 'simple' ? (
        <Summary searchQuery={searchQuery} filter={filter} />
      ) : (
        <DeepSummary searchQuery={searchQuery} filter={filter} />
      )}

      <ClauseList searchQuery={searchQuery} filter={filter} />
    </div>
  );
};

export default Dashboard;