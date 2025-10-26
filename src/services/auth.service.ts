import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AppUser } from '../types';

export const authService = {
  async signUp(email: string, password: string, displayName: string): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await firebaseUpdateProfile(user, { displayName });

    await setDoc(doc(db, 'profiles', user.uid), {
      id: user.uid,
      email: user.email,
      display_name: displayName,
      phone_number: null,
      photo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  },

  async getCurrentUser(): Promise<AppUser | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
    if (!profileDoc.exists()) return null;

    const profile = profileDoc.data();
    return {
      id: user.uid,
      email: profile.email,
      phone_number: profile.phone_number,
      display_name: profile.display_name,
      photo_url: profile.photo_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  },

  async updateProfile(userId: string, data: Partial<AppUser>): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.display_name !== undefined) {
      updateData.display_name = data.display_name;
      if (auth.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, { displayName: data.display_name });
      }
    }
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
    if (data.photo_url !== undefined) {
      updateData.photo_url = data.photo_url;
      if (auth.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, { photoURL: data.photo_url });
      }
    }

    await updateDoc(doc(db, 'profiles', userId), updateData);
  },
};
