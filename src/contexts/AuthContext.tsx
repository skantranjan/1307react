import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const checkAuthStatus = async () => {
    // Check for auth parameters from backend redirect
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const auth = urlParams.get('auth');
    
    if (code && state) {
      // User is returning from Azure AD authentication via backend
      setUser({
        id: 'user',
        name: 'Authenticated User',
        email: 'user@example.com',
        roles: ['user']
      });
      setIsAuthenticated(true);
      console.log('User authenticated via Azure AD');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (auth === 'success') {
      // Backend confirmed successful authentication
      setUser({
        id: 'user',
        name: 'Authenticated User',
        email: 'user@example.com',
        roles: ['user']
      });
      setIsAuthenticated(true);
      console.log('User authenticated via backend');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    
    setIsLoading(false);
  };

  const login = () => {
    // Direct Azure AD SSO - no backend API needed
    const authUrl = `https://login.microsoftonline.com/d1e23d19-ded6-4d66-850c-0d4f35bf2edc/oauth2/v2.0/authorize?client_id=9e96c018-8b47-4aed-99f2-5a4897bb44a0&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fsso%2Fcallback&scope=openid+profile+email+9e96c018-8b47-4aed-99f2-5a4897bb44a0%2Fuser_impersonation&state=${Math.random().toString(36).substring(7)}&nonce=${Math.random().toString(36).substring(7)}&response_mode=query`;
    
    console.log('Redirecting to Azure AD:', authUrl);
    window.location.href = authUrl;
  };

  const logout = () => {
    // Simple logout - clear state and redirect
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to home page
    window.location.href = '/';
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if we're returning from Azure AD authentication
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      // We're returning from Azure AD authentication
      console.log('Returning from Azure AD authentication');
      // Clear the URL parameters after processing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 