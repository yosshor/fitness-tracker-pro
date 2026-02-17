
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, authReady, hadOAuthCallback } from '../services/supabase';
import { getUserProfile, saveUserProfile } from '../services/supabaseService';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
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
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrCreateProfile = async (sbUser: User) => {
    try {
      const profile = await getUserProfile(sbUser.id);
      if (profile) {
        setUser(profile);
      } else {
        const displayName =
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          sbUser.email?.split('@')[0] || 'User';
        const newProfile: UserProfile = {
          id: sbUser.id,
          email: sbUser.email || '',
          displayName,
          currentSplit: 'Full Body',
          volumePerMuscle: 2,
          createdAt: new Date().toISOString()
        };
        await saveUserProfile(sbUser.id, newProfile);
        setUser(newProfile);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let loadingCleared = false;

    const clearLoading = () => {
      if (!cancelled && !loadingCleared) {
        loadingCleared = true;
        setIsLoading(false);
      }
    };

    // Track whether the OAuth setSession has resolved yet.
    // When we have a pending OAuth callback, ignore INITIAL_SESSION with null
    // session — setSession hasn't fired yet and the real session is coming.
    let oauthResolved = !hadOAuthCallback;

    // onAuthStateChange is the single source of truth for auth state.
    // It fires INITIAL_SESSION on setup, SIGNED_IN on login, TOKEN_REFRESHED, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        // During an OAuth callback, the listener fires INITIAL_SESSION with
        // session=null before setSession() completes. Skip that event —
        // the SIGNED_IN event will follow once setSession resolves.
        if (!oauthResolved && !session) {
          return;
        }

        if (session?.user) {
          setSupabaseUser(session.user);
          await loadOrCreateProfile(session.user);
        } else {
          setSupabaseUser(null);
          setUser(null);
        }
        clearLoading();
      }
    );

    // If we captured an OAuth hash, wait for setSession to complete.
    // Once it resolves, onAuthStateChange will fire SIGNED_IN with the session.
    // If it fails, clear loading so the user can retry.
    authReady
      .then(() => { oauthResolved = true; })
      .catch((err) => {
        console.error('Auth ready error:', err);
        oauthResolved = true;
        clearLoading();
      });

    // Hard safety timeout: if onAuthStateChange never fires (e.g. Supabase token
    // refresh hangs internally), ensure the loading spinner clears and shows login.
    // This prevents the app from being stuck on "Loading..." forever.
    // Use a longer timeout when an OAuth callback is pending (needs network round-trip).
    const safetyTimer = setTimeout(() => {
      if (!loadingCleared) {
        console.warn('Auth initialization timed out, showing login screen');
        oauthResolved = true;
        clearLoading();
      }
    }, hadOAuthCallback ? 8000 : 4000);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      const msg = err.message.includes('Invalid login credentials')
        ? 'Invalid email or password'
        : err.message.includes('Email not confirmed')
        ? 'Please confirm your email before signing in'
        : 'Login failed. Please try again';
      setError(msg);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) {
      setError('Google sign-in failed. Please try again');
      throw err;
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });
    if (err) {
      const msg = err.message.includes('already registered')
        ? 'An account with this email already exists'
        : err.message.includes('Password')
        ? 'Password must be at least 6 characters'
        : err.message.includes('valid email')
        ? 'Please enter a valid email'
        : 'Signup failed. Please try again';
      setError(msg);
      throw err;
    }
    if (data.user && data.session) {
      await loadOrCreateProfile(data.user);
    } else if (data.user && !data.session) {
      // Email confirmation is required — signal the UI
      throw new Error('EMAIL_CONFIRMATION_REQUIRED');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (err) {
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
      user, supabaseUser, isLoading, error,
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
