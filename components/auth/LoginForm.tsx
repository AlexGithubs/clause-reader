import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import styles from '../../styles/Auth.module.css';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMessage('Email and password are required');
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      await login(email, password);
      
      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h2>Log In</h2>
        <form onSubmit={handleSubmit}>
          {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
          
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          
          <div className={styles.formFooter}>
            <p>Don't have an account? <Link href="/signup">Sign up</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;