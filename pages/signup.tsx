import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import SignupForm from '@/components/auth/SignupForm';
import styles from '@/styles/Auth.module.css';

const Signup: NextPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Sign Up | Clause Reader</title>
      </Head>

      <div className={styles.formContainer}>
        <h1 className={styles.title}>Create your Clause Reader account</h1>
        <SignupForm />
      </div>
    </div>
  );
};

export default Signup;