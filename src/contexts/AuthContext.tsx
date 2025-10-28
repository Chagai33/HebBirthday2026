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
      if (firebaseUser) {
        try {
          await firebaseUser.getIdToken(true);

          let currentUser = await authService.getCurrentUser();
          let retries = 0;
          const maxRetries = 5;

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
        } catch (error) {
          console.error('Error loading user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    await authService.signUp(email, password, displayName);
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
