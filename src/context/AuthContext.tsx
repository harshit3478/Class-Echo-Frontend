import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { login } from '../lib/api';
import { UserRole } from '../types/api';

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
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await login(username, password);
      setSession({
        token: response.access_token,
        role: response.role,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInDirect = useCallback((token: string, role: UserRole) => {
    setSession({ token, role });
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
  }, []);

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
