import { ASSET_STATUS, type AssetStatus } from '@entanter/shared';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, Package, Users } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState, ErrorMessage } from '../../components/ui/Feedback';
import { InlineLoading } from '../../components/ui/Spinner';
import { api } from '../../lib/api-client';
import { formatNumber } from '../../lib/format';
import type { ConsumableRow, InventorySummary, StaffOpenAssignment } from '../../lib/types';

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div
        className={`rounded-md p-2.5 ${
          tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-600'
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const summary = useQuery({
    queryKey: ['reports', 'inventory-summary'],
    queryFn: () => api.get<InventorySummary>('/api/reports/inventory-summary'),
  });

  const lowStock = useQuery({
    queryKey: ['reports', 'low-stock'],
    queryFn: () => api.get<{ data: ConsumableRow[] }>('/api/reports/low-stock'),
  });

  const openAssignments = useQuery({
    queryKey: ['reports', 'staff-open-assignments'],
    queryFn: () =>
      api.get<{ data: StaffOpenAssignment[] }>('/api/reports/staff-open-assignments'),
  });

  if (summary.isPending) return <InlineLoading />;
  if (summary.isError) return <ErrorMessage error={summary.error} />;

  const byStatus = summary.data.assets.byStatus;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Genel Bakış</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Toplam demirbaş"
          value={formatNumber(summary.data.assets.total)}
          icon={Package}
        />
        <StatCard
          label="Zimmetli demirbaş"
          value={formatNumber(byStatus.assigned ?? 0)}
          icon={Users}
        />
        <StatCard
          label="Aksesuar kalemi"
          value={formatNumber(summary.data.consumables.items)}
          icon={Boxes}
        />
        <StatCard
          label="Kritik stok"
          value={formatNumber(summary.data.consumables.lowStockItems)}
          icon={AlertTriangle}
          tone={summary.data.consumables.lowStockItems > 0 ? 'warn' : 'default'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Demirbaş durumu</h2>
          </header>
          <div className="divide-y divide-slate-100">
            {(Object.keys(ASSET_STATUS) as AssetStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-600">{ASSET_STATUS[status]}</span>
                <span className="font-medium text-slate-900">
                  {formatNumber(byStatus[status] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Üzerinde zimmet olan personel</h2>
            <Link to="/personel" className="text-xs text-brand-600 hover:underline">
              Tümü
            </Link>
          </header>

          {openAssignments.isPending ? (
            <InlineLoading />
          ) : openAssignments.isError ? (
            <div className="p-4">
              <ErrorMessage error={openAssignments.error} />
            </div>
          ) : openAssignments.data.data.length === 0 ? (
            <EmptyState title="Açık zimmet yok" description="Şu anda kimsenin üzerinde kayıtlı kalem bulunmuyor." />
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Personel</th>
                    <th>Departman</th>
                    <th className="text-right">Açık kalem</th>
                  </tr>
                </thead>
                <tbody>
                  {openAssignments.data.data.map((row) => (
                    <tr key={row.staffId}>
                      <td>
                        <span className="font-medium text-slate-800">{row.staffName}</span>
                        <span className="block text-xs text-slate-500">{row.employeeNo}</span>
                      </td>
                      <td className="text-slate-600">{row.departmentName ?? '—'}</td>
                      <td className="text-right font-medium">{row.openItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Kritik stok seviyesindeki kalemler</h2>
          <Link to="/aksesuarlar" className="text-xs text-brand-600 hover:underline">
            Aksesuarlar
          </Link>
        </header>

        {lowStock.isPending ? (
          <InlineLoading />
        ) : lowStock.isError ? (
          <div className="p-4">
            <ErrorMessage error={lowStock.error} />
          </div>
        ) : lowStock.data.data.length === 0 ? (
          <EmptyState title="Kritik seviyede kalem yok" description="Tüm aksesuar stokları belirlenen alt sınırın üzerinde." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Stok kodu</th>
                  <th>Ad</th>
                  <th className="text-right">Mevcut</th>
                  <th className="text-right">Alt sınır</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.data.data.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs text-slate-500">{row.sku ?? '—'}</td>
                    <td className="font-medium text-slate-800">{row.name}</td>
                    <td className="text-right font-semibold text-amber-700">
                      {row.quantityOnHand} {row.unit}
                    </td>
                    <td className="text-right text-slate-500">{row.minStockLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
