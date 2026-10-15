/**
 * GURU COACH LMS - AUTHENTICATION & ROLE CONTEXT
 *
 * Manages authenticated user state, Firebase ID token lifecycle,
 * and safe isolated demo mode for testing and evaluation.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
} from '../config/firebase';

export type UserRole = 'admin' | 'manager' | 'learner' | 'demo';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'learner';
  jobTitle: string;
  badgeId: string | null;
  organizationId: string;
}

export interface DemoPersona {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'learner';
  jobTitle: string;
  badgeId: string;
  organizationId: string;
}

export const DEMO_PERSONAS: Record<'admin' | 'manager' | 'learner', DemoPersona> = {
  admin: {
    id: 'demo-admin-id',
    email: 'admin@guruji.internal',
    fullName: 'Rajesh Patel',
    role: 'admin',
    jobTitle: 'Head of Operations Training',
    badgeId: 'BADGE-ADM-01',
    organizationId: 'demo-org-quickcomm',
  },
  manager: {
    id: 'demo-manager-id',
    email: 'manager@guruji.internal',
    fullName: 'Priya Sharma',
    role: 'manager',
    jobTitle: 'Delivery Operations Lead',
    badgeId: 'BADGE-MGR-02',
    organizationId: 'demo-org-quickcomm',
  },
  learner: {
    id: 'demo-learner-id',
    email: 'learner@guruji.internal',
    fullName: 'Vikram Singh',
    role: 'learner',
    jobTitle: 'Field Return Associate',
    badgeId: 'BADGE-LRN-03',
    organizationId: 'demo-org-quickcomm',
  },
};

interface AuthContextType {
  currentUser: AuthenticatedUser | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole;
  isDemo: boolean;
  activePersona: DemoPersona | null;
  idToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  selectDemoPersona: (role: 'admin' | 'manager' | 'learner' | 'guest') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<DemoPersona | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Monitor Firebase Auth State
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);
        if (user) {
          try {
            const token = await user.getIdToken();
            setIdToken(token);

            // Exchange token with backend session endpoint
            const res = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.user) {
                setCurrentUser(data.user);
                setIsDemo(false);
                setActivePersona(null);
                setError(null);
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              setError(errData.message || 'Session synchronization failed');
            }
          } catch (tokenErr: any) {
            console.warn('[AuthContext] Token exchange warning:', tokenErr);
          }
        } else {
          setCurrentUser(null);
          setIdToken(null);
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('[AuthContext] Firebase auth listener unavailable (running in offline demo mode):', e);
    }
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Login failed. Account may not be provisioned.');
      }

      const data = await res.json();
      setCurrentUser(data.user);
      setIsDemo(false);
      setActivePersona(null);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const token = await result.user.getIdToken();
      setIdToken(token);

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Email authentication failed.');
      }

      const data = await res.json();
      setCurrentUser(data.user);
      setIsDemo(false);
      setActivePersona(null);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Email Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_) {}
    setCurrentUser(null);
    setFirebaseUser(null);
    setIdToken(null);
    setIsDemo(true);
    setActivePersona(null);
    setError(null);
  };

  const selectDemoPersona = (personaRole: 'admin' | 'manager' | 'learner' | 'guest') => {
    if (personaRole === 'guest') {
      setIsDemo(true);
      setActivePersona(null);
      setCurrentUser(null);
    } else {
      const persona = DEMO_PERSONAS[personaRole];
      setActivePersona(persona);
      setIsDemo(true);
      setCurrentUser(persona);
    }
    setIsAuthModalOpen(false);
    setError(null);
  };

  const role: UserRole = currentUser?.role || activePersona?.role || 'demo';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        role,
        isDemo,
        activePersona,
        idToken,
        isLoading,
        error,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        loginWithGoogle,
        loginWithEmail,
        logout,
        selectDemoPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
