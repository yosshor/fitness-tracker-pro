
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, authReady } from '../services/supabase';
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (session?.user) {
          setSupabaseUser(session.user);
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await loadOrCreateProfile(session.user);
          }
        } else {
          setSupabaseUser(null);
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    const initialize = async () => {
      try {
        await authReady;
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          setSupabaseUser(session.user);
          await loadOrCreateProfile(session.user);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // StrictMode cleanup
        console.error('Auth init error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initialize();
    return () => {
      cancelled = true;
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
