import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GEMINI_API_KEY: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

// Implicit flow returns tokens in the URL hash (#access_token=...).
// Since we use HashRouter (#/route), we need to intercept the auth hash
// BEFORE the router sees it. Extract and stash it, then let Supabase process it.
let capturedAuthHash: string | null = null;
const hash = window.location.hash;
if (hash && hash.includes('access_token=')) {
  capturedAuthHash = hash;
  // Clear the hash so HashRouter doesn't try to route "access_token=..."
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: false, // we handle it manually below
    // Reduce lock timeout from the default 10s to 3s. When a stale token
    // refresh hangs, this prevents the "Auth token processing timed out"
    // error from blocking the UI for 10+ seconds.
    lockAcquireTimeout: 3000,
  },
});

// Flag indicating whether an OAuth callback hash was captured.
// AuthContext uses this to avoid clearing loading state prematurely
// when onAuthStateChange fires INITIAL_SESSION with no session yet.
export const hadOAuthCallback = !!capturedAuthHash;

// If we captured an auth hash, manually set the session from the token.
// Export the promise so AuthContext can await it before reading the session.
export let authReady: Promise<void> = Promise.resolve();

if (capturedAuthHash) {
  const params = new URLSearchParams(capturedAuthHash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    authReady = supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(() => undefined);
  }
}
