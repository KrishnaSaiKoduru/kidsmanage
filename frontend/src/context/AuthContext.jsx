import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        fetchProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile() {
    try {
      const profile = await api.get('/auth/me');
      setUser(profile);
    } catch {
      // User might not exist in DB yet (e.g., just signed up)
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signUp({ email, password, centerName, directorName, phone }) {
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

    return result;
  }

  async function signUpUser({ name, email, password, phone, role, joinCode }) {
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

    return result;
  }

  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signUpUser, signIn, signOut }}>
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
