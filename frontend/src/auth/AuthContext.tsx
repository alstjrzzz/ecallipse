/* oxlint-disable react-refresh/only-export-components */
import {createContext, useContext, useMemo, useState, type PropsWithChildren} from 'react';
import {USERS} from '../data';
import type {UserProfile} from '../domain';

type AuthContextValue = {
  user: UserProfile | null;
  signIn: (userId: string) => void;
  signOut: () => void;
};

const STORAGE_KEY = 'ecallipse.session.user';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: PropsWithChildren) {
  const [userId, setUserId] = useState(() => sessionStorage.getItem(STORAGE_KEY));
  const user = userId ? USERS[userId] ?? null : null;

  const value = useMemo<AuthContextValue>(() => ({
    user,
    signIn(nextUserId) {
      sessionStorage.setItem(STORAGE_KEY, nextUserId);
      setUserId(nextUserId);
    },
    signOut() {
      sessionStorage.removeItem(STORAGE_KEY);
      setUserId(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
