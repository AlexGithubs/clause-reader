import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import styles from '@/styles/Home.module.css';
import { UploadCloud, Cpu, Search, BarChart } from 'lucide-react';

const Home: NextPage = () => {
  const { user, isLoading } = useAuth();

  return (
    <div className={styles.backgroundContainer}>
      <div className={styles.pageWrapper}>
        <Head>
          <title>Clause Reader | AI-Powered Contract Review</title>
          <meta name="description" content="Simplify contract review with AI. Upload PDFs, get instant analysis, identify risks, and understand legal documents faster." />
        </Head>

        <section className={`${styles.hero} ${styles.animatedFadeIn}`}>
          <div className={styles.heroContent}>
          <h1 className={styles.title}>
              Stop Drowning in Contracts. <br /> Start Understanding Them.
          </h1>
          <p className={styles.description}>
              Clause Reader uses AI to analyze your legal documents instantly. Upload your PDF, identify key clauses, uncover risks, and save hours of manual review.
          </p>
          <div className={styles.cta}>
              {isLoading ? (
                 <span className={styles.loadingPlaceholder}>Loading...</span>
              ) : user ? (
                <Link href="/dashboard" className={styles.ctaButton}>
                  Go to Your Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className={styles.ctaButton}>
                    Get Started Free
                  </Link>
                  <Link href="/signup" className={styles.secondaryButton}>
                    Sign Up
                  </Link>
                </>
            )}
            </div>
             <p className={styles.subtleText}>No credit card required.</p>
          </div>
          <div className={styles.heroVisual}>
            <img src="/drawing.png" alt="Contract analysis illustration" className={styles.heroImage} />
          </div>
        </section>

        <section className={`${styles.features} ${styles.sectionPadding}`}>
          <h2 className={styles.sectionTitle}>Unlock Effortless Contract Review</h2>
          <p className={styles.sectionSubtitle}>Focus on what matters, let AI handle the complexity.</p>
          
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><UploadCloud size={32} /></div>
              <h3>Seamless PDF Upload</h3>
              <p>Easily upload contracts via drag-and-drop or file selection.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Cpu size={32} /></div>
              <h3>AI-Powered Analysis</h3>
              <p>Instantly identify clauses, risks, and key terms with cutting-edge AI.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Search size={32} /></div>
              <h3>Intuitive Highlighting</h3>
              <p>Visually pinpoint important sections directly within your document.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><BarChart size={32} /></div>
              <h3>Clear Summaries</h3>
              <p>Get concise summaries and actionable insights for quick understanding.</p>
            </div>
          </div>
        </section>

        <section className={`${styles.howItWorks} ${styles.sectionPadding} ${styles.lightBackground}`}>
           <h2 className={styles.sectionTitle}>Get Started in 3 Simple Steps</h2>
           <div className={styles.stepsGrid}>
             <div className={styles.stepCard}>
               <div className={styles.stepNumber}>1</div>
               <h3>Upload Contract</h3>
               <p>Securely upload your PDF document.</p>
             </div>
             <div className={styles.stepCard}>
               <div className={styles.stepNumber}>2</div>
               <h3>AI Analyzes</h3>
               <p>Our AI processes the text, identifies clauses, and assesses risks.</p>
             </div>
             <div className={styles.stepCard}>
               <div className={styles.stepNumber}>3</div>
               <h3>Review Insights</h3>
               <p>Explore highlighted clauses, summaries, and analysis in the dashboard.</p>
             </div>
           </div>
        </section>

        <section className={`${styles.socialProof} ${styles.sectionPadding}`}>
            <h2 className={styles.sectionTitle}>Trusted by Professionals</h2>
             <div className={styles.logos}>
               <span>LOGO 1</span> <span>LOGO 2</span> <span>LOGO 3</span>
             </div>
             <div className={styles.testimonial}>
               <blockquote>
                 "Clause Reader transformed how we handle contract reviews. It saved us countless hours and improved our accuracy significantly."
               </blockquote>
               <cite>– Satisfied User, Legal Tech Co.</cite>
          </div>
       </section>

      </div>
    </div>
  );
};

export default Home;