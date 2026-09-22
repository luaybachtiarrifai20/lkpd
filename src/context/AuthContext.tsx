import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, type Profile } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshAuth: () => Promise<Profile | null>;
  beginRegistration: () => void;
  endRegistration: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // While a registration is in flight the profile document does not exist yet,
  // so the missing-profile sign-out below must not fire.
  const registeringRef = useRef(false);

  const refreshAuth = useCallback(async (): Promise<Profile | null> => {
    const currentUser = auth.currentUser;
    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    const profileDoc = await getDoc(doc(db, 'profiles', currentUser.uid));
    if (!profileDoc.exists()) {
      if (!registeringRef.current) {
        // Profile not found in database - user might have been deleted
        // Sign out the user to prevent stuck loading state
        await firebaseSignOut(auth);
        setUser(null);
      }
      setProfile(null);
      setLoading(false);
      return null;
    }

    const loadedProfile = { id: profileDoc.id, ...profileDoc.data() } as Profile;
    setProfile(loadedProfile);
    setLoading(false);
    return loadedProfile;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      void refreshAuth();
    });
    return () => unsubscribe();
  }, [refreshAuth]);

  const beginRegistration = useCallback(() => {
    registeringRef.current = true;
  }, []);

  const endRegistration = useCallback(() => {
    registeringRef.current = false;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshAuth, beginRegistration, endRegistration, signOut }}>
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
