
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, consumeOAuthTokens } from '../services/supabase';
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
    console.log('[AUTH DEBUG] loadOrCreateProfile — user id:', sbUser.id, 'email:', sbUser.email);
    try {
      const profile = await getUserProfile(sbUser.id);
      if (profile) {
        console.log('[AUTH DEBUG] Profile found in DB:', profile.displayName);
        setUser(profile);
      } else {
        console.log('[AUTH DEBUG] No profile in DB, creating new one');
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
        console.log('[AUTH DEBUG] Profile created successfully');
        setUser(newProfile);
      }
    } catch (err) {
      console.error('[AUTH DEBUG] loadOrCreateProfile FAILED:', err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let loadingCleared = false;
    const t0 = Date.now();

    console.log('[AUTH DEBUG] useEffect running, registering onAuthStateChange...');

    const clearLoading = () => {
      if (!cancelled && !loadingCleared) {
        loadingCleared = true;
        console.log('[AUTH DEBUG] clearLoading() called after', Date.now() - t0, 'ms');
        setIsLoading(false);
      }
    };

    // 1. Register the listener FIRST so we never miss events.
    //    IMPORTANT: The callback must NOT await DB queries directly, because
    //    onAuthStateChange fires from inside _initialize() which holds Supabase's
    //    internal lock. Every DB query calls getSession() which needs the same
    //    lock → deadlock. We defer DB work with setTimeout(0) to run after the
    //    lock is released.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH DEBUG] onAuthStateChange →', event, '| session:', !!session, '| user:', session?.user?.email ?? 'null', '| cancelled:', cancelled, '| +' + (Date.now() - t0) + 'ms');
        if (cancelled) return;
        if (session?.user) {
          setSupabaseUser(session.user);
          // Defer DB work to next tick — lock will be released by then
          const sbUser = session.user;
          setTimeout(async () => {
            if (cancelled) return;
            console.log('[AUTH DEBUG] deferred loadOrCreateProfile starting | +' + (Date.now() - t0) + 'ms');
            await loadOrCreateProfile(sbUser);
            clearLoading();
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUser(null);
          clearLoading();
        } else {
          // INITIAL_SESSION with no session — user state is already null by default
          clearLoading();
        }
      }
    );

    // 2. If we captured OAuth tokens, call setSession() NOW.
    const oauthTokens = consumeOAuthTokens();
    if (oauthTokens) {
      console.log('[AUTH DEBUG] Calling setSession() with OAuth tokens...');
      supabase.auth.setSession({
        access_token: oauthTokens.accessToken,
        refresh_token: oauthTokens.refreshToken,
      }).then((result) => {
        console.log('[AUTH DEBUG] setSession() resolved — session:', !!result.data.session, '| error:', result.error?.message ?? 'none', '| +' + (Date.now() - t0) + 'ms');
      }).catch((err) => {
        console.error('[AUTH DEBUG] setSession() REJECTED:', err, '| +' + (Date.now() - t0) + 'ms');
        clearLoading();
      });
    }

    // 3. Hard safety timeout.
    const safetyTimer = setTimeout(() => {
      if (!loadingCleared) {
        console.warn('[AUTH DEBUG] SAFETY TIMEOUT after 4000ms — forcing login screen');
        clearLoading();
      }
    }, 4000);

    return () => {
      console.log('[AUTH DEBUG] useEffect CLEANUP (cancelled=true)');
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    console.log('[AUTH DEBUG] login() called for:', email);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      console.error('[AUTH DEBUG] login() error:', err.message);
      const msg = err.message.includes('Invalid login credentials')
        ? 'Invalid email or password'
        : err.message.includes('Email not confirmed')
        ? 'Please confirm your email before signing in'
        : 'Login failed. Please try again';
      setError(msg);
      throw err;
    }
    console.log('[AUTH DEBUG] login() success — waiting for onAuthStateChange SIGNED_IN');
  };

  const loginWithGoogle = async () => {
    setError(null);
    console.log('[AUTH DEBUG] loginWithGoogle() called — redirectTo:', window.location.origin);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) {
      console.error('[AUTH DEBUG] loginWithGoogle() error:', err.message);
      setError('Google sign-in failed. Please try again');
      throw err;
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    setError(null);
    console.log('[AUTH DEBUG] signup() called for:', email);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (err) {
      console.error('[AUTH DEBUG] signup() error:', err.message);
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
    console.log('[AUTH DEBUG] signup() result — user:', !!data.user, '| session:', !!data.session);
    if (data.user && !data.session) {
      throw new Error('EMAIL_CONFIRMATION_REQUIRED');
    }
    console.log('[AUTH DEBUG] signup() success with session — waiting for onAuthStateChange SIGNED_IN');
  };

  const logout = async () => {
    console.log('[AUTH DEBUG] logout() called');
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
