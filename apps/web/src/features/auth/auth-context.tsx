import type { AuthenticatedUser, LoginResponse } from '@entanter/shared';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  refreshSession,
  setAccessToken,
  setUnauthorizedHandler,
} from '../../lib/api-client';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  /** Ilk aciliste oturum geri yuklenirken true. */
  isBootstrapping: boolean;
  login: (username: string, password: string) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  /**
   * Sayfa yenilendiginde access token bellekte kaybolur; ancak refresh
   * cookie'si durdugu icin oturum sessizce geri yuklenebilir.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const restored = await refreshSession();
      if (cancelled) return;

      if (restored) {
        try {
          const me = await api.get<AuthenticatedUser>('/api/auth/me');
          if (!cancelled) setUser(me);
        } catch {
          setAccessToken(null);
        }
      }
      if (!cancelled) setIsBootstrapping(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Yenileme de basarisiz olursa oturumu kapat.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.post<LoginResponse>('/api/auth/login', { username, password });
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.get<AuthenticatedUser>('/api/auth/me');
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isBootstrapping, login, logout, refreshUser }),
    [user, isBootstrapping, login, logout, refreshUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return context;
}
