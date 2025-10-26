import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBBqfTUaYPcxono_V_db1IaRRtPsu5kSdc",
  authDomain: "hebbirthday2026.firebaseapp.com",
  projectId: "hebbirthday2026",
  storageBucket: "hebbirthday2026.firebasestorage.app",
  messagingSenderId: "971070020927",
  appId: "1:971070020927:web:a698918fbe5974e384078a",
  measurementId: "G-WLLEGR9S71"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
