
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail, signInWithPopup, User
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { getUserProfile, saveUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const profile = await getUserProfile(fbUser.uid);
          if (profile) {
            setUser(profile);
          } else {
            const newProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              currentSplit: 'Full Body',
              volumePerMuscle: 2,
              createdAt: new Date().toISOString()
            };
            await saveUserProfile(fbUser.uid, newProfile);
            setUser(newProfile);
          }
        } catch (err) {
          console.error('Error loading profile:', err);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password'
        : err.code === 'auth/user-not-found' ? 'No account found with this email'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later'
        : 'Login failed. Please try again';
      setError(msg);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle profile creation/loading
    } catch (err: any) {
      const msg = err.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled'
        : err.code === 'auth/popup-blocked' ? 'Pop-up blocked. Allow pop-ups and try again'
        : 'Google sign-in failed. Please try again';
      setError(msg);
      throw err;
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const newProfile: UserProfile = {
        id: cred.user.uid,
        email,
        displayName,
        currentSplit: 'Full Body',
        volumePerMuscle: 2,
        createdAt: new Date().toISOString()
      };
      await saveUserProfile(cred.user.uid, newProfile);
      setUser(newProfile);
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use' ? 'An account with this email already exists'
        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : err.code === 'auth/invalid-email' ? 'Please enter a valid email'
        : 'Signup failed. Please try again';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError('Failed to send reset email');
      throw err;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    await saveUserProfile(user.id, updates);
    setUser({ ...user, ...updates });
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user, firebaseUser, isLoading, error,
      login, loginWithGoogle, signup, logout, resetPassword, updateProfile, clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
