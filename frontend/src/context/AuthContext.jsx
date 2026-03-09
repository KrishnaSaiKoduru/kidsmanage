import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

const OAUTH_STORAGE_KEY = 'kidsmanage_oauth_pending';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Guard to prevent onAuthStateChange from interfering during explicit signIn/signUp
  const authInProgress = useRef(false);
  // Prevent concurrent handleSessionReady calls (e.g. getSession + onAuthStateChange)
  const sessionHandling = useRef(false);

  useEffect(() => {
    // Get initial session — only handle no-session case to set loading false.
    // If a session exists, let onAuthStateChange handle it to avoid double calls.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) {
        setLoading(false);
      }
    });

    // Listen for auth changes (fires INITIAL_SESSION on setup, covers getSession case)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        // Skip if signIn/signUp is handling auth explicitly to avoid race condition
        if (!authInProgress.current) {
          handleSessionReady(s);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSessionReady(s) {
    // Prevent concurrent calls (getSession + onAuthStateChange can both trigger this)
    if (sessionHandling.current) return;
    sessionHandling.current = true;
    setLoading(true);
    try {
      const profile = await fetchProfile();
      if (profile) return; // already registered, done

      // fetchProfile returned null — could be "user not found" (401) or a transient error.
      // Check if we got a 401 by seeing if user was cleared (fetchProfile only clears on 401).
      // For transient errors (network/500), user state is preserved and we skip sign-out.

      // No DB user — check if there's pending OAuth registration data
      const pending = localStorage.getItem(OAUTH_STORAGE_KEY);
      if (pending) {
        const { role, joinCode, name } = JSON.parse(pending);
        await api.post('/auth/complete-oauth', { role, joinCode, name });
        localStorage.removeItem(OAUTH_STORAGE_KEY);
        // Retry fetching profile after completing registration
        await fetchProfile();
      } else {
        // Only sign out if the server confirmed user doesn't exist (401).
        // For network errors or server errors, keep the session alive — Supabase
        // will auto-refresh the token and the next attempt should succeed.
        try {
          const verifyRes = await api.get('/auth/me');
          if (verifyRes) {
            setUser(verifyRes);
            return;
          }
        } catch (verifyErr) {
          if (verifyErr.status === 401) {
            console.warn('[Auth] Supabase session exists but no DB user found. Signing out.');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            return;
          }
        }
        // Non-401 error — keep session, don't sign out. The user may recover.
        console.warn('[Auth] Could not verify profile (server/network issue). Keeping session.');
      }
    } catch (err) {
      console.error('[Auth] Session ready handler failed:', err);
      // Clear stale OAuth data on failure so user isn't stuck
      localStorage.removeItem(OAUTH_STORAGE_KEY);
      // Don't clear user on transient errors — only on confirmed 401
      if (err.status === 401) {
        setUser(null);
      }
    } finally {
      sessionHandling.current = false;
      setLoading(false);
    }
  }

  async function fetchProfile() {
    try {
      const profile = await api.get('/auth/me');
      setUser(profile);
      return profile;
    } catch (err) {
      console.error('[Auth] Failed to fetch profile:', err.message);
      // Only clear user if server explicitly says user not found (401).
      // For network errors or server errors (500), keep existing user state
      // so transient failures don't log the user out.
      if (err.status === 401) {
        setUser(null);
      }
      return null;
    }
  }

  async function signUp({ email, password, centerName, directorName, phone }) {
    authInProgress.current = true;
    try {
      // Register via backend (creates Supabase user + Center + DB User)
      const result = await api.post('/auth/register', {
        email,
        password,
        centerName,
        directorName,
        phone,
      });

      // Sign in with Supabase to get session
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Explicitly fetch profile instead of relying on listener race
      await fetchProfile();

      return result;
    } finally {
      authInProgress.current = false;
    }
  }

  async function signUpUser({ name, email, password, phone, role, joinCode }) {
    authInProgress.current = true;
    try {
      // Register parent/caretaker via backend (creates Supabase user + links to center via join code)
      const result = await api.post('/auth/register-user', {
        name,
        email,
        password,
        phone,
        role,
        joinCode,
      });

      // Sign in with Supabase to get session
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Explicitly fetch profile instead of relying on listener race
      await fetchProfile();

      return result;
    } finally {
      authInProgress.current = false;
    }
  }

  async function signIn({ email, password }) {
    authInProgress.current = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Explicitly fetch profile to avoid race with onAuthStateChange listener
      await fetchProfile();
    } finally {
      authInProgress.current = false;
    }
  }

  async function signInWithGoogle({ role, joinCode, name } = {}) {
    // If signing up (role + joinCode provided), store in localStorage for post-redirect
    if (role && joinCode) {
      localStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify({ role, joinCode, name: name || '' }));
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem(OAUTH_STORAGE_KEY);
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, session, loading, signUp, signUpUser, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
