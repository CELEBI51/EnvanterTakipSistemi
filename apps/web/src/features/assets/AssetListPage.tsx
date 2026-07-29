import { ASSET_STATUS, ASSET_STATUS_VALUES } from '@entanter/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorMessage } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { InlineLoading } from '../../components/ui/Spinner';
import { AssetStatusBadge } from '../../components/ui/StatusBadge';
import { api, buildQuery } from '../../lib/api-client';
import { formatDate } from '../../lib/format';
import { useDebounced } from '../../lib/hooks';
import type { AssetRow, Paginated } from '../../lib/types';

export function AssetListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search);

  const query = useQuery({
    queryKey: ['assets', debouncedSearch, status, page],
    queryFn: () =>
      api.get<Paginated<AssetRow>>(
        `/api/assets${buildQuery({ q: debouncedSearch, status, page, limit: 25 })}`,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Demirbaşlar</h1>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="input pl-9"
              placeholder="Demirbaş no, seri no, marka veya model ara..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Demirbaş ara"
            />
          </div>

          <select
            className="input w-auto"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Duruma göre filtrele"
          >
            <option value="">Tüm durumlar</option>
            {ASSET_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {ASSET_STATUS[value]}
              </option>
            ))}
          </select>
        </div>

        {query.isPending ? (
          <InlineLoading />
        ) : query.isError ? (
          <div className="p-4">
            <ErrorMessage error={query.error} />
          </div>
        ) : query.data.data.length === 0 ? (
          <EmptyState
            title="Demirbaş bulunamadı"
            description="Arama kriterlerini değiştirin veya yeni demirbaş kaydı oluşturun."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Demirbaş No</th>
                    <th>Marka / Model</th>
                    <th>Seri No</th>
                    <th>Kategori</th>
                    <th>Durum</th>
                    <th>Kimde</th>
                    <th>Alım tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs font-medium text-slate-700">
                        {row.assetTag}
                      </td>
                      <td>
                        <span className="font-medium text-slate-800">{row.brand ?? '—'}</span>
                        <span className="block text-xs text-slate-500">{row.model ?? ''}</span>
                      </td>
                      <td className="font-mono text-xs text-slate-500">{row.serialNo ?? '—'}</td>
                      <td className="text-slate-600">{row.categoryName ?? '—'}</td>
                      <td>
                        <AssetStatusBadge status={row.status} />
                      </td>
                      <td className="text-slate-700">{row.currentHolderName ?? '—'}</td>
                      <td className="text-slate-500">{formatDate(row.purchaseDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              total={query.data.meta.total}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
