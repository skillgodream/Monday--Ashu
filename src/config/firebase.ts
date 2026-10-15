/**
 * GURU COACH LMS - CLIENT FIREBASE CONFIGURATION
 *
 * Initializes the client-side Firebase Web SDK for authentication.
 * Falls back safely to offline / demo mode if Firebase client credentials are not configured.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyC0IYHY0x3bNAGYWYIX2JltzivSarcxIkQ',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'field-trainer-f168c.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'field-trainer-f168c',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'field-trainer-f168c.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};
export type { FirebaseUser };
