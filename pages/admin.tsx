import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import AdminOnly from '@/components/layout/AdminOnly';
import styles from '@/styles/Dashboard.module.css';

interface AdminUser {
  id: number;
  email: string;
  role: string;
  lastLogin: string;
}

const Admin: NextPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalClauses: 0,
    totalUsers: 0
  });

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && user.user_metadata.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Fetch admin data
  useEffect(() => {
    if (user && user.user_metadata.role === 'admin') {
      // In a real app, these would be API calls to Netlify Functions
      // For this scaffold, we'll use mock data
      setUsers([
        { id: 1, email: 'user1@example.com', role: 'standard', lastLogin: '2023-03-15' },
        { id: 2, email: 'user2@example.com', role: 'admin', lastLogin: '2023-04-01' },
        { id: 3, email: 'user3@example.com', role: 'standard', lastLogin: '2023-03-29' }
      ]);
      
      setStats({
        totalUploads: 24,
        totalClauses: 1245,
        totalUsers: 3
      });
    }
  }, [user]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user || user.user_metadata.role !== 'admin') {
    return null; // Will redirect due to useEffect
  }

  return (
    <AdminOnly>
      <div className={styles.container}>
        <Head>
          <title>Admin Dashboard | Clause Reader</title>
        </Head>

        <h1 className={styles.title}>Admin Dashboard</h1>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Total Users</h3>
            <p className={styles.statValue}>{stats.totalUsers}</p>
          </div>
          
          <div className={styles.statCard}>
            <h3>Total Uploads</h3>
            <p className={styles.statValue}>{stats.totalUploads}</p>
          </div>
          
          <div className={styles.statCard}>
            <h3>Total Clauses Analyzed</h3>
            <p className={styles.statValue}>{stats.totalClauses}</p>
          </div>
        </div>
        
        <h2 className={styles.subtitle}>User Management</h2>
        
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.adminBadge : styles.standardBadge}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.lastLogin}</td>
                <td>
                  <button className={styles.actionButton}>Edit</button>
                  <button className={styles.actionButton}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminOnly>
  );
};

export default Admin;