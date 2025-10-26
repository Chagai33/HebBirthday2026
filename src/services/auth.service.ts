import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  linkWithCredential,
  EmailAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  User,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AppUser } from '../types';

export const authService = {
  async createUserDocument(user: User, additionalData?: any): Promise<AppUser> {
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const linkedProviders = user.providerData.map(p => p.providerId);

      const userData: Omit<AppUser, 'id'> = {
        email: user.email || undefined,
        phoneNumber: user.phoneNumber || undefined,
        displayName: user.displayName || additionalData?.displayName || '',
        photoURL: user.photoURL || undefined,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        tenants: [],
        linkedProviders,
        ...additionalData,
      };

      await setDoc(userRef, userData);

      return {
        id: user.uid,
        ...userData,
      } as AppUser;
    }

    const existingData = snapshot.data();
    const linkedProviders = user.providerData.map(p => p.providerId);

    if (JSON.stringify(existingData.linkedProviders) !== JSON.stringify(linkedProviders)) {
      await updateDoc(userRef, {
        linkedProviders,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      id: snapshot.id,
      ...existingData,
    } as AppUser;
  },

  async getUserDocument(userId: string): Promise<AppUser | null> {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as AppUser;
  },

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await firebaseUpdateProfile(userCredential.user, { displayName });
    await this.createUserDocument(userCredential.user, { displayName });

    return userCredential.user;
  },

  async signIn(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await this.createUserDocument(userCredential.user);
    return userCredential.user;
  },

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await this.createUserDocument(userCredential.user);
    return userCredential.user;
  },

  async signInWithPhone(phoneNumber: string, appVerifier: RecaptchaVerifier) {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  },

  async linkEmailPassword(email: string, password: string): Promise<void> {
    if (!auth.currentUser) throw new Error('No user signed in');

    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(auth.currentUser, credential);
    await this.createUserDocument(auth.currentUser);
  },

  async linkGoogleAccount(): Promise<void> {
    if (!auth.currentUser) throw new Error('No user signed in');

    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    await this.createUserDocument(auth.currentUser);
  },

  async linkPhoneNumber(phoneNumber: string, appVerifier: RecaptchaVerifier) {
    if (!auth.currentUser) throw new Error('No user signed in');

    const provider = new PhoneAuthProvider(auth);
    return await provider.verifyPhoneNumber(phoneNumber, appVerifier);
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  },

  async updateUserProfile(userId: string, data: Partial<AppUser>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    if (auth.currentUser && (data.displayName || data.photoURL)) {
      await firebaseUpdateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: data.photoURL,
      });
    }
  },
};
