import React from 'react';
import { AppProps } from 'next/app';
import '../styles/globals.css';
import { SupabaseAuthProvider } from '../components/auth/SupabaseAuthContext';
import { AuthProvider } from '../components/auth/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

function MyApp({ Component, pageProps, router }: AppProps) {
  // Track page views for GA4
  React.useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', process.env.NEXT_PUBLIC_GA4_ID || '', {
          page_path: url,
        });
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Check if this is a public page (no auth required)
  const isPublicPage = ['/login', '/signup', '/'].includes(router.pathname);

  return (
    <SupabaseAuthProvider>
      <AuthProvider>
        <Navbar />
        <main className="container">
          <Component {...pageProps} />
        </main>
        <Footer />
      </AuthProvider>
    </SupabaseAuthProvider>
  );
}

export default MyApp;