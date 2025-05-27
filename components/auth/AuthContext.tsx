import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseAuth } from './SupabaseAuthContext';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Define the User type to match what the old code expects
interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    role: 'admin' | 'standard';
  };
  app_metadata: {
    roles?: string[];
  };
  token?: {
    access_token: string;
    expires_at: number;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isIdentityReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isIdentityReady: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Convert Supabase user to legacy user format
const convertSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;
  
  const role = supabaseUser.user_metadata?.role || 'standard';
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    user_metadata: {
      full_name: supabaseUser.user_metadata?.full_name,
      role: role as 'admin' | 'standard',
    },
    app_metadata: {
      roles: [role],
    },
    token: {
      access_token: 'supabase-token', // Placeholder - real token handled by Supabase
      expires_at: Date.now() / 1000 + 3600, // 1 hour from now
    },
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: supabaseUser, isLoading, signIn, signUp, signOut } = useSupabaseAuth();
  
  // Convert Supabase user to legacy format
  const user = convertSupabaseUser(supabaseUser);
  
  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await signIn(email, password);
    if (error) {
      throw new Error(error.message);
    }
  };

  const signup = async (email: string, password: string, fullName: string): Promise<void> => {
    const { error } = await signUp(email, password, fullName);
    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async (): Promise<void> => {
    const { error } = await signOut();
    if (error) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isIdentityReady: !isLoading, 
        login, 
        signup, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};