import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import styles from '@/styles/Navbar.module.css';

const Navbar: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <Link href="/" className={styles.logo}>
          Clause Reader
        </Link>
        
        <div className={styles.navLinks}>
          {user ? (
              <>
                <Link 
                  href="/dashboard" 
                  className={`${styles.navLink} ${router.pathname === '/dashboard' ? styles.active : ''}`}
                >
                  Dashboard
                </Link>
                
                <Link 
                  href="/upload" 
                  className={`${styles.navLink} ${router.pathname === '/upload' ? styles.active : ''}`}
                >
                  Upload
                </Link>
                
                {user.user_metadata.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    className={`${styles.navLink} ${router.pathname === '/admin' ? styles.active : ''}`}
                  >
                    Admin
                  </Link>
                )}
                
                <div className={styles.userSection}>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>
                      {user.user_metadata.full_name || user.email}
                    </span>
                    <span className={`${styles.roleBadge} ${user.user_metadata.role === 'admin' ? styles.adminBadge : styles.standardBadge}`}>
                      {user.user_metadata.role}
                    </span>
                  </div>
                  
                  <button onClick={handleLogout} className={styles.logoutButton}>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className={`${styles.navLink} ${router.pathname === '/login' ? styles.active : ''}`}
                >
                  Login
                </Link>
                
                <Link 
                  href="/signup" 
                  className={`${styles.navLink} ${styles.signupLink} ${router.pathname === '/signup' ? styles.active : ''}`}
                >
                  Sign Up
                </Link>
              </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;