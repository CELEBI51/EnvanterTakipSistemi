import { ClipboardList } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ErrorMessage } from '../../components/ui/Feedback';
import { FullPageSpinner, Spinner } from '../../components/ui/Spinner';
import { useAuth } from './auth-context';

export function LoginPage() {
  const { user, isBootstrapping, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isBootstrapping) return <FullPageSpinner label="Oturum kontrol ediliyor..." />;
  if (user) return <Navigate to={user.mustChangePassword ? '/parola-degistir' : '/'} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedIn = await login(username.trim(), password);
      void navigate(loggedIn.mustChangePassword ? '/parola-degistir' : '/', { replace: true });
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
          <ClipboardList className="h-10 w-10 text-brand-600" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-slate-900">Envanter ve Zimmet Takip</h1>
          <p className="text-sm text-slate-500">Devam etmek için giriş yapın</p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="card space-y-4 p-6">
          {error ? <ErrorMessage error={error} /> : null}

          <div>
            <label className="label" htmlFor="username">
              Kullanıcı adı
            </label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Parola
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
            Giriş Yap
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Bu sistem yalnızca fabrika iç ağından erişilebilir.
        </p>
      </div>
    </div>
  );
}
