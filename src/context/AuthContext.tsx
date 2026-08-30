import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, type Profile } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshAuth: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async (): Promise<Profile | null> => {
    let loadedProfile: Profile | null = null;
    if (user?.uid) {
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      if (profileDoc.exists()) {
        loadedProfile = { id: profileDoc.id, ...profileDoc.data() } as Profile;
      } else {
        // Profile not found in database - user might have been deleted
        // Sign out the user to prevent stuck loading state
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
      }
    }
    setProfile(loadedProfile);
    setLoading(false);
    return loadedProfile;
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await refreshAuth();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshAuth, signOut }}>
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
