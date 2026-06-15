import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { login } from '../lib/api';
import { setUnauthorizedHandler } from '../lib/authSession';
import { deleteItem, getItem, setItem } from '../lib/storage';
import { UserRole } from '../types/api';

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role';

type Session = {
  token: string;
  role: UserRole;
};

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  signIn: (username: string, password: string) => Promise<void>;
  signInDirect: (token: string, role: UserRole) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const token = await getItem(TOKEN_KEY);
        const role = await getItem(ROLE_KEY);
        if (token && role) {
          setSession({ token, role: role as UserRole });
        }
      } catch {
        // ignore storage errors on load
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const persistSession = useCallback(async (token: string, role: UserRole) => {
    await setItem(TOKEN_KEY, token);
    await setItem(ROLE_KEY, role);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await login(username, password);
      const newSession = { token: response.access_token, role: response.role };
      await persistSession(newSession.token, newSession.role);
      setSession(newSession);
    } finally {
      setIsLoading(false);
    }
  }, [persistSession]);

  const signInDirect = useCallback(async (token: string, role: UserRole) => {
    await persistSession(token, role);
    setSession({ token, role });
  }, [persistSession]);

  const signOut = useCallback(async () => {
    await deleteItem(TOKEN_KEY);
    await deleteItem(ROLE_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({
      isLoading,
      session,
      signIn,
      signInDirect,
      signOut,
    }),
    [isLoading, session, signIn, signInDirect, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
