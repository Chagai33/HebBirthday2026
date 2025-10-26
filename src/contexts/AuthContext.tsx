import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, RecaptchaVerifier } from 'firebase/auth';
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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          const appUser = await authService.createUserDocument(firebaseUser);
          setUser(appUser);
        } catch (error) {
          console.error('Error loading user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    await authService.signUp(email, password, displayName);
  };

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signInWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    return await authService.signInWithPhone(phoneNumber, appVerifier);
  };

  const confirmPhoneSignIn = async (verificationId: string, code: string) => {
    const { PhoneAuthProvider, signInWithCredential } = await import('firebase/auth');
    const credential = PhoneAuthProvider.credential(verificationId, code);
    await signInWithCredential(auth, credential);
  };

  const linkEmailPassword = async (email: string, password: string) => {
    await authService.linkEmailPassword(email, password);
  };

  const linkGoogleAccount = async () => {
    await authService.linkGoogleAccount();
  };

  const linkPhoneNumber = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    return await authService.linkPhoneNumber(phoneNumber, appVerifier);
  };

  const signOut = async () => {
    await authService.signOut();
  };

  const updateProfile = async (data: Partial<AppUser>) => {
    if (!user) throw new Error('No user signed in');
    await authService.updateUserProfile(user.id, data);
    const updatedUser = await authService.getUserDocument(user.id);
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithPhone,
    confirmPhoneSignIn,
    linkEmailPassword,
    linkGoogleAccount,
    linkPhoneNumber,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
