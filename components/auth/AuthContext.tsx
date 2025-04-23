import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

declare global {
  interface Window {
    netlifyIdentity: {
      currentUser: () => User | null;
      on: (event: string, callback: any) => void;
      off: (event: string, callback: any) => void;
      login: (credentials: any, callback?: (error: Error) => void) => void;
      signup: (credentials: any, callback?: (error: Error) => void) => void;
      logout: () => void;
      refresh: (force?: boolean) => Promise<string>;
      close: () => void;
      open: (tabName?: 'login' | 'signup') => void;
      init: (options?: { APIUrl?: string }) => void;
      gotrue: any;
    };
  }
}

// Define the User type based on Netlify Identity
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [netlifyIdentity, setNetlifyIdentity] = useState<Window['netlifyIdentity'] | null>(null);

  // Bypass authentication in development if env var is set
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  if (bypassAuth) {
    // Provide a dummy admin user for local development
    const devUser: User = {
      id: 'dev-user',
      email: 'dev@local',
      user_metadata: { role: 'admin' },
      app_metadata: { roles: ['admin'] },
    };
    return (
      <AuthContext.Provider
        value={{
          user: devUser,
          isLoading: false,
          isIdentityReady: true,
          login: async () => {},
          signup: async () => {},
          logout: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  // Define handlers in a scope accessible to cleanup
  const loginHandler = (loggedInUser: User) => {
    setUser(loggedInUser);
    // Default to 'standard' role for new users if not set
    if (netlifyIdentity && !loggedInUser.user_metadata?.role) {
      netlifyIdentity.gotrue?.currentUser()?.update({
        data: {
          ...loggedInUser.user_metadata,
          role: 'standard',
        },
      });
    }
    // Close the modal after login
    netlifyIdentity?.close();
  };

  const logoutHandler = () => {
    setUser(null);
  };

  useEffect(() => {
    let identityInstance: Window['netlifyIdentity'] | null = null;
    let initHandlerAttached = false; // Flag to prevent duplicate listeners

    // This function runs *after* the 'init' event fires
    const handleIdentityInit = (initializedUser: User | null) => {
      console.log('[Auth] Netlify Identity "init" event received. User:', initializedUser);
      identityInstance = window.netlifyIdentity; // Get the instance again after init
      setNetlifyIdentity(identityInstance);
      setUser(initializedUser); // User object provided by 'init' event
      setIsLoading(false); // Now we are truly ready

      // Attach login/logout listeners *after* init
      identityInstance.on('login', loginHandler);
      identityInstance.on('logout', logoutHandler);
    };

    // Function to attach the 'init' listener
    const setupIdentityListeners = () => {
      if (window.netlifyIdentity && !initHandlerAttached) {
        console.log('[Auth] Attaching Netlify Identity "init" listener.');
        window.netlifyIdentity.on('init', handleIdentityInit);
        initHandlerAttached = true;
        // Note: Calling identity methods like .open() might be needed here
        // if the init event doesn't fire automatically on script load.
        // window.netlifyIdentity.open(); 
      } else {
         console.log('[Auth] setupIdentityListeners called but window.netlifyIdentity not ready or handler already attached.');
      }
    };

    if (typeof window !== 'undefined') {
      if (!window.netlifyIdentity) {
        console.log('[Auth] Netlify Identity script not found, loading...');
        const script = document.createElement('script');
        script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
        script.async = true;
        script.onload = () => {
          console.log('[Auth] Netlify Identity script loaded.');
          setupIdentityListeners();
          // Initialize the widget, pointing at the local Dev Identity endpoint
          const apiUrl = process.env.NEXT_PUBLIC_IDENTITY_URL
            ? process.env.NEXT_PUBLIC_IDENTITY_URL
            : `${window.location.protocol}//${window.location.host}/.netlify/identity`;
          console.log('[Auth] Initializing Netlify Identity with APIUrl:', apiUrl);
          window.netlifyIdentity?.init({ APIUrl: apiUrl, apiUrl: apiUrl });
        };
        script.onerror = () => {
           console.error('[Auth] Failed to load Netlify Identity script.');
           setIsLoading(false); // Stop loading on script error
        };
        document.head.appendChild(script);
      } else {
        console.log('[Auth] Netlify Identity script already present.');
        setupIdentityListeners();
        // Re-init on existing widget (e.g. on hot reload)
        const apiUrl = process.env.NEXT_PUBLIC_IDENTITY_URL
          ? process.env.NEXT_PUBLIC_IDENTITY_URL
          : `${window.location.protocol}//${window.location.host}/.netlify/identity`;
        console.log('[Auth] Re-initializing Netlify Identity with APIUrl:', apiUrl);
        window.netlifyIdentity?.init({ APIUrl: apiUrl, apiUrl: apiUrl });
      }
    } else {
      setIsLoading(false); // Not in browser environment
    }

    // Cleanup function
    return () => {
      console.log('[Auth] Cleaning up AuthContext useEffect.');
      if (identityInstance) {
        console.log('[Auth] Removing Netlify Identity listeners.');
        identityInstance.off('init', handleIdentityInit); // Clean up 'init' listener
        identityInstance.off('login', loginHandler);
        identityInstance.off('logout', logoutHandler);
      }
    };
  }, []); // Run only once on mount

  // isIdentityReady depends on netlifyIdentity state, which is now set *after* 'init'
  const isIdentityReady = !isLoading && !!netlifyIdentity;

  const login = async (email: string, password: string): Promise<void> => {
    if (!netlifyIdentity) {
      throw new Error('Netlify Identity not initialized');
    }
    const authClient = netlifyIdentity.gotrue;
    return new Promise((resolve, reject) => {
      authClient.login({ email, password })
        .then((user: User) => {
          setUser(user);
          resolve();
        })
        .catch((err: any) => reject(err));
    });
  };

  const signup = async (email: string, password: string, fullName: string): Promise<void> => {
    if (!netlifyIdentity) {
      throw new Error('Netlify Identity not initialized');
    }
    const authClient = netlifyIdentity.gotrue;
    return new Promise((resolve, reject) => {
      authClient.signup({
        email,
        password,
        user_metadata: { full_name: fullName, role: 'standard' }
      })
      .then((user: User) => {
        setUser(user);
        resolve();
      })
      .catch((err: any) => reject(err));
    });
  };

  const logout = async (): Promise<void> => {
    if (!netlifyIdentity) {
      throw new Error('Netlify Identity not initialized');
    }
    return new Promise((resolve, reject) => {
      netlifyIdentity.logout();
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isIdentityReady, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};