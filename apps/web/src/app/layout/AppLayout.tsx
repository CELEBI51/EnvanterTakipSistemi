import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../features/auth/auth-context';

const NAV_ITEMS = [
  { to: '/', label: 'Genel Bakış', icon: LayoutDashboard, end: true },
  { to: '/personel', label: 'Personel', icon: Users, end: false },
  { to: '/demirbaslar', label: 'Demirbaşlar', icon: Package, end: false },
  { to: '/aksesuarlar', label: 'Aksesuar / Sarf', icon: Boxes, end: false },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    void navigate('/giris', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-brand-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Envanter ve Zimmet Takip</p>
              <p className="text-xs text-slate-500">Fabrika İç Ağ Sistemi</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.username}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="btn-secondary"
              title="Çıkış yap"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl px-4" aria-label="Ana menü">
          <ul className="flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
