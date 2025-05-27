import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Session, AuthResponse } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: Error | null }>;
}

// Create context with default values
const SupabaseAuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ data: { user: null, session: null }, error: null }),
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => ({ error: null }),
});

export const useSupabaseAuth = () => useContext(SupabaseAuthContext);

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bypass authentication in development if env var is set
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  
  useEffect(() => {
    if (bypassAuth) {
      setIsLoading(false);
      console.log('Bypass auth enabled, skipping Supabase session check');
      return;
    }

    // Check for active session on initial load
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Supabase getSession result:', { session, error });
      if (error) {
        console.error('Error getting session:', error);
      }
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
      console.log('Session set:', session, 'User set:', session?.user, 'isLoading:', false);
    };

    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event, newSession);
        setSession(newSession);
        setUser(newSession?.user || null);
      }
    );

    // Clean up the subscription
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [bypassAuth]);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'standard'
        }
      }
    });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  // Return a dev user if bypass auth is enabled
  if (bypassAuth) {
    const devUser = {
      id: 'dev-user',
      email: 'dev@local',
      user_metadata: { full_name: 'Dev User', role: 'admin' },
    } as unknown as User;

    const devSession = {
      user: devUser,
      access_token: 'fake-token',
      refresh_token: 'fake-refresh-token',
    } as unknown as Session;

    return (
      <SupabaseAuthContext.Provider
        value={{
          user: devUser,
          session: devSession,
          isLoading: false,
          signIn: async () => ({ data: { user: devUser, session: devSession }, error: null }) as AuthResponse,
          signUp: async () => ({ data: { user: devUser, session: devSession }, error: null }) as AuthResponse,
          signOut: async () => ({ error: null }),
        }}
      >
        {children}
      </SupabaseAuthContext.Provider>
    );
  }

  return (
    <SupabaseAuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export default SupabaseAuthProvider; 