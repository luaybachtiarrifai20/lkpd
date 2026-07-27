import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshAuth: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth for loading session + profile.
  // Uses getSession() (NOT inside onAuthStateChange) so the access
  // token is always fully propagated before any DB query runs.
  const refreshAuth = useCallback(async (): Promise<Profile | null> => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);

    let loadedProfile: Profile | null = null;
    if (currentSession?.user?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();
      if (error) {
        console.error('[Auth] refreshAuth profile error:', error.message);
      } else {
        loadedProfile = data as Profile | null;
      }
    }
    setProfile(loadedProfile);
    setLoading(false);
    return loadedProfile;
  }, []);

  // On mount: restore session from localStorage via getSession().
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Listen for auth changes (sign-out, token refresh). We do NOT
  // query the DB inside this callback — instead we re-trigger
  // refreshAuth() which uses getSession() to avoid the deadlock.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[Auth] onAuthStateChange:', event);
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          // Re-load profile outside the callback to avoid deadlock.
          refreshAuth();
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
