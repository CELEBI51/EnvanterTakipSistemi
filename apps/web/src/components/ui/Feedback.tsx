import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApiError } from '../../lib/api-client';

export function ErrorMessage({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Beklenmeyen bir hata oluştu.';

  return (
    <div
      className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-slate-500">
      <Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" />
      <p className="font-medium text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-sm">{description}</p> : null}
    </div>
  );
}
