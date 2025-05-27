import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseAuth } from './SupabaseAuthContext';
import Link from 'next/link';
import styles from '../../styles/Auth.module.css';

const SignupForm: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signUp } = useSupabaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMessage('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      const { error } = await signUp(email, password, fullName);
      
      if (error) {
      console.error('Signup error:', error);
        setErrorMessage(error.message || 'Failed to create account');
        return;
      }
      
      setSuccessMessage('Account created! Please check your email to confirm your account.');
      
      // Wait a moment then redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      console.error('Signup exception:', err);
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
          {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
      
      <div className={styles.formGroup}>
            <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          required
        />
      </div>
      
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
      
      <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
          required
        />
      </div>
      
      <button 
        type="submit" 
        className={styles.submitButton}
            disabled={isLoading}
      >
            {isLoading ? 'Creating account...' : 'Create Account'}
      </button>
      
      <div className={styles.formFooter}>
            <p>Already have an account? <Link href="/login">Sign in</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupForm;