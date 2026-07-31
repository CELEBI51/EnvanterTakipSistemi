import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} aria-hidden="true" />;
}

export function FullPageSpinner({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-500"
      role="status"
    >
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function InlineLoading({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500" role="status">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}
