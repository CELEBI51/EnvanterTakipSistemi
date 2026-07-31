import { ASSET_STATUS, ASSIGNMENT_STATUS, type AssetStatus, type AssignmentStatus } from '@entanter/shared';

const ASSET_STATUS_STYLE: Record<AssetStatus, string> = {
  in_stock: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  assigned: 'bg-blue-100 text-blue-800 ring-blue-200',
  in_repair: 'bg-amber-100 text-amber-800 ring-amber-200',
  scrapped: 'bg-slate-200 text-slate-700 ring-slate-300',
  lost: 'bg-red-100 text-red-800 ring-red-200',
  retired: 'bg-slate-200 text-slate-700 ring-slate-300',
};

const ASSIGNMENT_STATUS_STYLE: Record<AssignmentStatus, string> = {
  open: 'bg-blue-100 text-blue-800 ring-blue-200',
  partially_returned: 'bg-amber-100 text-amber-800 ring-amber-200',
  closed: 'bg-slate-200 text-slate-700 ring-slate-300',
};

const base =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap';

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <span className={`${base} ${ASSET_STATUS_STYLE[status]}`}>{ASSET_STATUS[status]}</span>;
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <span className={`${base} ${ASSIGNMENT_STATUS_STYLE[status]}`}>
      {ASSIGNMENT_STATUS[status]}
    </span>
  );
}

export function CountBadge({ value, tone }: { value: number; tone: 'neutral' | 'warn' }) {
  const style =
    tone === 'warn' && value > 0
      ? 'bg-amber-100 text-amber-800 ring-amber-200'
      : 'bg-slate-100 text-slate-600 ring-slate-200';
  return <span className={`${base} ${style}`}>{value}</span>;
}
