import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import styles from '@/styles/Auth.module.css';

const LoginForm: React.FC = () => {
  const { login, isIdentityReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!email || !password) {
      setError('Both email and password are required');
      return;
    }
    
    try {
      setError('');
      setIsSubmitting(true);
      
      await login(email, password);
      
      // The redirect will be handled by the useEffect in the login page
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder="your@email.com"
          required
        />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="password" className={styles.label}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          placeholder="********"
          required
        />
      </div>
      
      <button 
        type="submit" 
        className={styles.submitButton}
        disabled={isSubmitting || !isIdentityReady}
      >
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </button>
      
      <div className={styles.formFooter}>
        <p>
          Don't have an account? <Link href="/signup" className={styles.link}>Sign up</Link>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;