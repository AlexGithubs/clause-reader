import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import styles from '@/styles/Auth.module.css';

const Login: NextPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Login | Clause Reader</title>
      </Head>

      <div className={styles.formContainer}>
        <h1 className={styles.title}>Log in to Clause Reader</h1>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;