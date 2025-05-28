/**
 * Auth utility for Netlify Identity integration
 * Provides helper functions for authentication operations
 */

// Extend Window interface to include netlifyIdentity
declare global {
  interface Window {
    netlifyIdentity: {
      currentUser(): User | null;
      login(options: any, callback?: (error: Error) => void): void;
      signup(options: any, callback?: (error: Error) => void): void;
      logout(): void;
      refresh(): void;
      on(event: string, callback: (user?: User) => void): void;
      off(event: string, callback: (user?: User) => void): void;
    };
  }
}

// Type definitions
export interface User {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      role: 'admin' | 'standard';
    };
    app_metadata: {
      roles?: string[];
    };
    token: {
      access_token: string;
      expires_at: number;
    };
  }
  
  /**
   * Initialize Netlify Identity widget
   */
  export function initNetlifyIdentity(): void {
    if (typeof window === 'undefined') return;
    
    // Check if the identity widget is already loaded
    if (!window.netlifyIdentity) {
      // Create and load the Netlify Identity script
      const script = document.createElement('script');
      script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
      script.async = true;
      document.body.appendChild(script);
      
      // Dispatch event when identity is ready
      script.onload = () => {
        document.dispatchEvent(new Event('identityReady'));
      };
    } else {
      // If already loaded, dispatch the event immediately
      document.dispatchEvent(new Event('identityReady'));
    }
  }
  
  /**
   * Get the current user from Netlify Identity
   * @returns The current user or null if not logged in
   */
  export function getCurrentUser(): User | null {
    if (typeof window === 'undefined' || !window.netlifyIdentity) {
      return null;
    }
    
    const user = window.netlifyIdentity.currentUser();
    return user as User | null;
  }
  
  /**
   * Check if the current user has a specific role
   * @param role The role to check for
   * @returns Boolean indicating if the user has the role
   */
  export function hasRole(role: 'admin' | 'standard'): boolean {
    const user = getCurrentUser();
    
    if (!user) {
      return false;
    }
    
    return user.user_metadata?.role === role;
  }
  
  /**
   * Get the authentication token for API requests
   * @returns The JWT token or null if not authenticated
   */
  export function getAuthToken(): string | null {
    const user = getCurrentUser();
    
    if (!user || !user.token) {
      return null;
    }
    
    // Check if the token is expired
    const now = Date.now() / 1000;
    if (user.token.expires_at < now) {
      // Token is expired, trigger a refresh
      if (window.netlifyIdentity) {
        window.netlifyIdentity.refresh();
      }
      return null;
    }
    
    return user.token.access_token;
  }
  
  /**
   * Add authentication headers to a fetch request
   * @param init The fetch init object
   * @returns The fetch init object with auth headers added
   */
  export function addAuthHeaders(init: RequestInit = {}): RequestInit {
    const token = getAuthToken();
    
    if (!token) {
      return init;
    }
    
    return {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }
  
  /**
   * Login with email and password
   * @param email User's email
   * @param password User's password
   * @returns Promise that resolves when login is complete
   */
  export function login(email: string, password: string): Promise<User> {
    if (typeof window === 'undefined' || !window.netlifyIdentity) {
      return Promise.reject(new Error('Netlify Identity not initialized'));
    }
    
    return new Promise((resolve, reject) => {
      window.netlifyIdentity.login(
        { email, password },
        (error: Error) => {
          if (error) {
            reject(error);
          }
        }
      );
      
      // Listen for login event
      const loginHandler = (user?: User) => {
        window.netlifyIdentity.off('login', loginHandler);
        if (user) resolve(user);
      };
      
      window.netlifyIdentity.on('login', loginHandler);
    });
  }
  
  /**
   * Sign up with email and password
   * @param email User's email
   * @param password User's password
   * @param userData Additional user data
   * @returns Promise that resolves when signup is complete
   */
  export function signup(
    email: string,
    password: string,
    userData: { full_name?: string; role?: 'admin' | 'standard' }
  ): Promise<User> {
    if (typeof window === 'undefined' || !window.netlifyIdentity) {
      return Promise.reject(new Error('Netlify Identity not initialized'));
    }
    
    // Default to standard role if not specified
    const role = userData.role || 'standard';
    
    return new Promise((resolve, reject) => {
      window.netlifyIdentity.signup(
        {
          email,
          password,
          user_metadata: {
            full_name: userData.full_name,
            role,
          },
        },
        (error: Error) => {
          if (error) {
            reject(error);
          }
        }
      );
      
      // Listen for signup event
      const signupHandler = (user?: User) => {
        window.netlifyIdentity.off('signup', signupHandler);
        if (user) resolve(user);
      };
      
      window.netlifyIdentity.on('signup', signupHandler);
    });
  }
  
  /**
   * Logout the current user
   * @returns Promise that resolves when logout is complete
   */
  export function logout(): Promise<void> {
    if (typeof window === 'undefined' || !window.netlifyIdentity) {
      return Promise.reject(new Error('Netlify Identity not initialized'));
    }
    
    return new Promise((resolve, reject) => {
      window.netlifyIdentity.logout();
      
      // Listen for logout event
      const logoutHandler = () => {
        window.netlifyIdentity.off('logout', logoutHandler);
        resolve();
      };
      
      window.netlifyIdentity.on('logout', logoutHandler);
    });
  }
  
  export default {
    initNetlifyIdentity,
    getCurrentUser,
    hasRole,
    getAuthToken,
    addAuthHeaders,
    login,
    signup,
    logout,
  };