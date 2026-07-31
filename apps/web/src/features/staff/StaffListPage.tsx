import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorMessage } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { InlineLoading } from '../../components/ui/Spinner';
import { CountBadge } from '../../components/ui/StatusBadge';
import { api, buildQuery } from '../../lib/api-client';
import { useDebounced } from '../../lib/hooks';
import type { Paginated, StaffRow } from '../../lib/types';

export function StaffListPage() {
  const [search, setSearch] = useState('');
  const [onlyWithAssignments, setOnlyWithAssignments] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search);

  const query = useQuery({
    queryKey: ['staff', debouncedSearch, onlyWithAssignments, page],
    queryFn: () =>
      api.get<Paginated<StaffRow>>(
        `/api/staff${buildQuery({
          q: debouncedSearch,
          hasOpenAssignments: onlyWithAssignments ? 'true' : '',
          page,
          limit: 25,
        })}`,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Personel</h1>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="input pl-9"
              placeholder="Ad, soyad veya sicil no ile ara..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Personel ara"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={onlyWithAssignments}
              onChange={(event) => {
                setOnlyWithAssignments(event.target.checked);
                setPage(1);
              }}
            />
            Sadece üzerinde zimmet olanlar
          </label>
        </div>

        {query.isPending ? (
          <InlineLoading />
        ) : query.isError ? (
          <div className="p-4">
            <ErrorMessage error={query.error} />
          </div>
        ) : query.data.data.length === 0 ? (
          <EmptyState
            title="Personel bulunamadı"
            description="Arama kriterlerini değiştirin veya yeni personel ekleyin."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Sicil No</th>
                    <th>Ad Soyad</th>
                    <th>Departman</th>
                    <th>Görev</th>
                    <th className="text-center">Üzerindeki kalem</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs text-slate-500">{row.employeeNo}</td>
                      <td className="font-medium text-slate-800">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="text-slate-600">{row.departmentName ?? '—'}</td>
                      <td className="text-slate-600">{row.title ?? '—'}</td>
                      <td className="text-center">
                        <CountBadge value={row.openItemCount} tone="warn" />
                      </td>
                      <td>
                        <span
                          className={`text-xs ${row.isActive ? 'text-emerald-700' : 'text-slate-400'}`}
                        >
                          {row.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
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
