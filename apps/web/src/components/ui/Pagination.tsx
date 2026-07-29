import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onChange }: Props) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
      <p className="text-slate-500">
        Toplam <span className="font-medium text-slate-700">{total}</span> kayıt
        {totalPages > 1 ? ` · sayfa ${page}/${totalPages}` : null}
      </p>

      {totalPages > 1 ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary px-2 py-1"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn-secondary px-2 py-1"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
