import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorMessage } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { InlineLoading } from '../../components/ui/Spinner';
import { api, buildQuery } from '../../lib/api-client';
import { useDebounced } from '../../lib/hooks';
import type { ConsumableRow, Paginated } from '../../lib/types';

export function ConsumableListPage() {
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search);

  const query = useQuery({
    queryKey: ['consumables', debouncedSearch, onlyLowStock, page],
    queryFn: () =>
      api.get<Paginated<ConsumableRow>>(
        `/api/consumables${buildQuery({
          q: debouncedSearch,
          lowStock: onlyLowStock ? 'true' : '',
          page,
          limit: 25,
        })}`,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Aksesuar / Sarf Malzeme</h1>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="input pl-9"
              placeholder="Ad veya stok kodu ara..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Aksesuar ara"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={onlyLowStock}
              onChange={(event) => {
                setOnlyLowStock(event.target.checked);
                setPage(1);
              }}
            />
            Sadece kritik stok
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
            title="Kayıt bulunamadı"
            description="Arama kriterlerini değiştirin veya yeni aksesuar kalemi ekleyin."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Stok Kodu</th>
                    <th>Ad</th>
                    <th>Kategori</th>
                    <th className="text-right">Depoda</th>
                    <th className="text-right">Personelde</th>
                    <th className="text-right">Alt sınır</th>
                    <th className="text-right">Koli içi</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs text-slate-500">{row.sku ?? '—'}</td>
                      <td className="font-medium text-slate-800">{row.name}</td>
                      <td className="text-slate-600">{row.categoryName ?? '—'}</td>
                      <td
                        className={`text-right font-semibold ${
                          row.isLowStock ? 'text-amber-700' : 'text-slate-800'
                        }`}
                      >
                        {row.quantityOnHand} {row.unit}
                      </td>
                      <td className="text-right text-slate-600">{row.assignedQuantity}</td>
                      <td className="text-right text-slate-500">{row.minStockLevel}</td>
                      <td className="text-right text-slate-500">{row.packageSize}</td>
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
