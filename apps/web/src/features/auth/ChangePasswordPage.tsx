import { passwordSchema } from '@entanter/shared';
import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ErrorMessage } from '../../components/ui/Feedback';
import { FullPageSpinner, Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api-client';
import { useAuth } from './auth-context';

export function ChangePasswordPage() {
  const { user, isBootstrapping, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isBootstrapping) return <FullPageSpinner />;
  if (!user) return <Navigate to="/giris" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(new Error('Yeni parola ile tekrarı aynı değil.'));
      return;
    }

    // Ayni sema sunucuda da uygulanir; buradaki kontrol yalnizca
    // kullaniciya hizli geri bildirim icin.
    const check = passwordSchema.safeParse(newPassword);
    if (!check.success) {
      setError(new Error(check.error.issues[0]?.message ?? 'Parola kurallara uymuyor.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword });
      // Sunucu TUM oturumlari kapatti; yeniden giris gerekiyor.
      await logout();
      void navigate('/giris', { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <KeyRound className="h-10 w-10 text-brand-600" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-slate-900">Parola Değiştir</h1>
          {user.mustChangePassword ? (
            <p className="text-sm text-amber-700">
              Geçici parolanızı değiştirmeden diğer işlemleri yapamazsınız.
            </p>
          ) : null}
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="card space-y-4 p-6">
          {error ? <ErrorMessage error={error} /> : null}

          <div>
            <label className="label" htmlFor="current">
              Mevcut parola
            </label>
            <input
              id="current"
              type="password"
              className="input"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="new">
              Yeni parola
            </label>
            <input
              id="new"
              type="password"
              className="input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              En az 10 karakter, en az bir harf ve bir rakam içermeli.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="confirm">
              Yeni parola (tekrar)
            </label>
            <input
              id="confirm"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
            Parolayı Değiştir
          </button>
        </form>
      </div>
    </div>
  );
}
