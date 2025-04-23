import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import styles from '@/styles/Auth.module.css';

const SignupForm: React.FC = () => {
  const { signup, isIdentityReady } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!email || !password || !fullName) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      setError('');
      setIsSubmitting(true);
      
      await signup(email, password, fullName);
      
      // The redirect will be handled by the useEffect in the signup page
    } catch (error) {
      console.error('Signup error:', error);
      setError('Unable to create account. This email may already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.formGroup}>
        <label htmlFor="fullName" className={styles.label}>Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={styles.input}
          placeholder="John Doe"
          required
        />
      </div>
      
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
          minLength={8}
          required
        />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          placeholder="********"
          minLength={8}
          required
        />
      </div>
      
      <button 
        type="submit" 
        className={styles.submitButton}
        disabled={isSubmitting || !isIdentityReady}
      >
        {isSubmitting ? 'Creating Account...' : 'Sign Up'}
      </button>
      
      <div className={styles.formFooter}>
        <p>
          Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
        </p>
      </div>
    </form>
  );
};

export default SignupForm;