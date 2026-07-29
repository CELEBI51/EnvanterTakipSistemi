import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../features/auth/auth-context';
import { FullPageSpinner } from '../components/ui/Spinner';

/**
 * Korumali alanlarin kapisi.
 *
 * Gecici parola durumu API tarafinda da zorlanir (403); buradaki yonlendirme
 * yalnizca kullaniciya duzgun bir akis sunmak icindir, guvenligin kendisi degil.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return <FullPageSpinner label="Oturum kontrol ediliyor..." />;

  if (!user) return <Navigate to="/giris" replace state={{ from: location.pathname }} />;

  if (user.mustChangePassword) return <Navigate to="/parola-degistir" replace />;

  return <>{children}</>;
}
