import { AppProps } from 'next/app';
import { useEffect } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import '@/styles/global.css';

function MyApp({ Component, pageProps, router }: AppProps) {
  // Initialize Netlify Identity
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load Netlify Identity script
      const script = document.createElement('script');
      script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
      script.async = true;
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  // Track page views for GA4
  useEffect(() => {
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
    <AuthProvider>
      <Navbar />
      <main className="container">
        <Component {...pageProps} />
      </main>
      <Footer />
    </AuthProvider>
  );
}

export default MyApp;