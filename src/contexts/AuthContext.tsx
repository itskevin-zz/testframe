import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ALLOWED_DOMAINS = ['getaddie.com', 'brewery.agency'];

// Helper function to check if email is from allowed domain
const isEmailAllowed = (email: string): boolean => {
  const emailDomain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(emailDomain);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Verify email domain on sign in
        if (!isEmailAllowed(authUser.email || '')) {
          // Sign out user with unauthorized domain
          await firebaseSignOut(auth);
          setUser(null);
          setError('Only @getaddie.com and @brewery.agency email addresses are allowed');
          setLoading(false);
          return;
        }
      }
      setUser(authUser);
      setError(null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);

      // Check if email domain is allowed
      if (!isEmailAllowed(result.user.email || '')) {
        // Sign out the user immediately
        await firebaseSignOut(auth);
        setUser(null);
        setError('Only @getaddie.com and @brewery.agency email addresses are allowed');
        throw new Error('Unauthorized email domain');
      }

      setUser(result.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error signing in with Google';
      setError(errorMessage);
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
