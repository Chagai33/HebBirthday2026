import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/auth.service';
import { AppUser, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Always set loading when auth state changes
      setLoading(true);

      try {
        if (firebaseUser) {
          let tokenResult = await firebaseUser.getIdTokenResult(true);
          let retries = 0;
          const maxRetries = 10;

          while (!tokenResult.claims.tenantId && retries < maxRetries) {
            console.warn(`Waiting for Custom Claims (${retries + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            tokenResult = await firebaseUser.getIdTokenResult(true);
            retries++;
          }

          if (!tokenResult.claims.tenantId) {
            console.error('Custom Claims not set after multiple retries, signing out');
            await authService.signOut();
            setUser(null);
            setLoading(false);
            return;
          }

          let currentUser = await authService.getCurrentUser();
          retries = 0;

          while (!currentUser && retries < maxRetries) {
            console.warn(`User profile not found, retrying (${retries + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            currentUser = await authService.getCurrentUser();
            retries++;
          }

          if (currentUser) {
            setUser(currentUser);
          } else {
            console.error('User profile not found after multiple retries, signing out');
            await authService.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password);
    // setLoading is handled by onAuthStateChanged
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    await authService.signUp(email, password, displayName);
    // setLoading is handled by onAuthStateChanged
  };

  const signOut = async () => {
    await authService.signOut();
  };

  const updateProfile = async (data: Partial<AppUser>) => {
    if (!user) throw new Error('No user signed in');
    await authService.updateProfile(user.id, data);
    const updatedUser = await authService.getCurrentUser();
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
