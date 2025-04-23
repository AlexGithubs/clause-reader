import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import styles from '@/styles/Home.module.css';

const Home: NextPage = () => {
  const { user, isLoading } = useAuth();

  return (
    <div className={styles.container}>
      <Head>
        <title>Clause Reader | AI-Powered Contract Review</title>
      </Head>

      <section className={styles.hero}>
        <h1 className={styles.title}>
          Clause Reader
        </h1>
        <p className={styles.description}>
          AI-powered contract analysis that makes legal review simple and efficient
        </p>
        
        <div className={styles.cta}>
          {user ? (
            <Link href="/dashboard" className={styles.ctaButton}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.ctaButton}>
                Login
              </Link>
              <Link href="/signup" className={styles.secondaryButton}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </section>

      <section className={styles.features}>
        <h2>Key Features</h2>
        
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3>PDF Contract Upload</h3>
            <p>Simple drag-and-drop interface for contract uploads</p>
          </div>
          
          <div className={styles.featureCard}>
            <h3>AI-Powered Analysis</h3>
            <p>Advanced AI identifies key clauses and potential issues</p>
          </div>
          
          <div className={styles.featureCard}>
            <h3>Clause Highlighting</h3>
            <p>Visually identify important clauses and risks in your contracts</p>
          </div>
          
          <div className={styles.featureCard}>
            <h3>Summary Dashboard</h3>
            <p>Get quick insights or deep analysis based on your needs</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;