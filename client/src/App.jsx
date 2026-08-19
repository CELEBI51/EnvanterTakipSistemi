import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import ForceChangePasswordPage from './features/auth/pages/ForceChangePasswordPage';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import UsersList from './features/admin/users/UsersList';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import HardwareList from './features/hardware/pages/HardwareList';
import LicenseList from './features/licenses/pages/LicenseList';
import AccessoryList from './features/accessories/pages/AccessoryList';
import ConsumableList from './features/consumables/pages/ConsumableList';
import ComponentList from './features/components/pages/ComponentList';
import EmployeeList from './features/employees/pages/EmployeeList';
import AssignmentList from './features/assignments/pages/AssignmentList';
import CreateAssignmentPage from './features/assignments/pages/CreateAssignmentPage';
import ReturnList from './features/returns/pages/ReturnList';
import CreateReturnPage from './features/returns/pages/CreateReturnPage';
import SettingsLayout from './features/settings/pages/SettingsLayout';
import useAuthStore from './store/authStore';
import { hasPermission } from './utils/permissions';
import {
  LayoutDashboard,
  Monitor,
  Headphones,
  Key,
  Users,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ShieldCheck,
  Building2,
  Package,
  Cpu,
  ClipboardCheck,
  RotateCcw,
} from 'lucide-react';

function ProtectedRoute({ children, allowedRoles, requiredPermission, isForcePasswordRoute = false }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && !isForcePasswordRoute) {
    return <Navigate to="/force-change-password" replace />;
  }

  if (!user?.mustChangePassword && isForcePasswordRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(user?.role?.toString().toLowerCase().trim())) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}


function MainLayout({ children }) {
  const token = useAuthStore((state) => state.accessToken);
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [notificationsData, setNotificationsData] = useState(null);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const popoverRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  const fetchNotificationsSummary = async () => {
    if (!token) return;
    setLoadingNotifs(true);
    try {
      const res = await fetch('http://localhost:4001/api/notifications/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setNotificationsData(data.data);
      }
    } catch (err) {
      console.error('Bildirim özeti yüklenemedi:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotificationsSummary();
  }, [token, location.pathname]);

  // Click outside & ESC key handler to close popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
      }
    };

    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [popoverOpen]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Zimmetleme', path: '/assignments', icon: ClipboardCheck, permission: 'assignments:view' },
    { label: 'Zimmet İade', path: '/returns', icon: RotateCcw, permission: 'returns:view' },
    { label: 'Varlıklar', path: '/hardware', icon: Monitor, permission: 'hardware:view' },
    { label: 'Lisans', path: '/licenses', icon: Key, permission: 'licenses:view' },
    { label: 'Aksesuar', path: '/accessories', icon: Headphones, permission: 'accessories:view' },
    { label: 'Sarf Malzeme', path: '/consumables', icon: Package, permission: 'consumables:view' },
    { label: 'Bileşen', path: '/components', icon: Cpu, permission: 'components:view' },
    { label: 'Personel', path: '/employees', icon: Users, permission: 'employees:view' },
  ].filter((item) => !item.permission || hasPermission(user, item.permission));


  return (
    <div className="min-h-screen flex font-sans transition-colors duration-300" style={{ backgroundColor: 'var(--theme-page-bg)', color: 'var(--theme-text-primary)' }}>
      {/* 1. PERMANENT LEFT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen shadow-xl z-20 transition-colors duration-300" style={{ backgroundColor: 'var(--theme-sidebar-bg)', color: 'var(--theme-sidebar-text)' }}>
        {/* DİTAŞ Corporate Logo */}
        <div className="p-4 flex items-center justify-center" style={{ borderBottom: '1px solid var(--theme-sidebar-border)' }}>
          <img src="/ditas-logo.png" alt="DİTAŞ Logo" className="h-20 w-auto max-w-full object-contain transition-transform duration-200 hover:scale-105" />
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${isActive
                  ? 'font-bold shadow-xs'
                  : ''
                  }`}
              style={isActive
                ? { backgroundColor: 'var(--theme-accent)', color: '#fff', boxShadow: `0 2px 8px var(--theme-accent-shadow)` }
                : { color: 'var(--theme-sidebar-muted)' }
              }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Users (Admin Only) */}
          {isAdmin && (
            <Link
              to="/admin/users"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${location.pathname.startsWith('/admin/users') ? 'font-bold shadow-xs' : ''}`}
              style={location.pathname.startsWith('/admin/users')
                ? { backgroundColor: 'var(--theme-accent)', color: '#fff' }
                : { color: 'var(--theme-sidebar-muted)' }
              }
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Kullanıcı Yönetimi</span>
            </Link>
          )}

          {/* System Settings (Admin Only) */}
          {isAdmin && (
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${location.pathname.startsWith('/settings') ? 'font-bold shadow-xs' : ''}`}
              style={location.pathname.startsWith('/settings')
                ? { backgroundColor: 'var(--theme-accent)', color: '#fff' }
                : { color: 'var(--theme-sidebar-muted)' }
              }
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Sistem Ayarları</span>
            </Link>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 text-[11px] flex items-center gap-2" style={{ borderTop: '1px solid var(--theme-sidebar-border)', color: 'var(--theme-sidebar-muted)' }}>
          <span>DİTAŞ Otomotiv © 2026</span>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP NAVIGATION BAR */}
        <header className="h-16 sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 shadow-xs transition-colors duration-300" style={{ backgroundColor: 'var(--theme-header-bg)', borderBottom: '1px solid var(--theme-header-border)' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-[#1E2534] hover:bg-slate-100 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 pl-4">
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => {
                  setPopoverOpen((prev) => {
                    const nextState = !prev;
                    if (nextState) {
                      fetchNotificationsSummary();
                    }
                    return nextState;
                  });
                }}
                className="relative p-2 text-slate-500 hover:text-[#1E2534] hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Bildirimler"
              >
                <Bell className="w-5 h-5" />
                {(notificationsData?.totalUnread || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-full min-w-[18px] text-center leading-none ring-2 ring-white">
                    {notificationsData.totalUnread}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown Panel */}
              {popoverOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh] sm:max-h-[480px]">
                  {/* Header */}
                  <div className="p-4 bg-[#1E2534] text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#4F8FE0]" />
                      <h3 className="font-heading text-sm font-bold">Bildirimler</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#4F8FE0] text-white rounded-full">
                      {notificationsData?.totalUnread || 0} Bildirim
                    </span>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1 divide-y divide-slate-100">
                    {loadingNotifs && !notificationsData ? (
                      <div className="py-8 text-center text-slate-400 font-medium">
                        Bildirimler yükleniyor...
                      </div>
                    ) : (
                      <>
                        {/* 1. Süresi Yaklaşan Lisanslar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <span>Süresi Yaklaşan Lisanslar</span>
                            <span className="text-slate-400 font-mono">({notificationsData?.expiringLicenses?.totalCount || 0})</span>
                          </div>

                          {!notificationsData?.expiringLicenses?.items?.length ? (
                            <p className="text-slate-400 italic text-[11px] py-1">Şu an bildirim yok</p>
                          ) : (
                            <div className="space-y-1.5">
                              {notificationsData.expiringLicenses.items.map((lic) => {
                                const isExpired = lic.daysRemaining < 0;
                                return (
                                  <div
                                    key={lic.id}
                                    onClick={() => {
                                      setPopoverOpen(false);
                                      navigate(`/licenses?licenseId=${lic.id}`);
                                    }}
                                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#EAF2FC]/50 border border-slate-100 transition cursor-pointer flex items-center justify-between gap-2 group"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-[#1E2534] truncate group-hover:text-[#4F8FE0]">
                                        {lic.brand} {lic.productInfo}
                                      </p>
                                      <p className="text-[11px] text-slate-500 truncate">
                                        Birim: {lic.unit?.name || '-'}
                                      </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                      isExpired
                                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}>
                                      {isExpired ? `${Math.abs(lic.daysRemaining)} gün önce doldu` : `${lic.daysRemaining} gün kaldı`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 2. Kritik Stoktaki Aksesuarlar */}
                        <div className="pt-3 space-y-2">
                          <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <span>Kritik Stoktaki Aksesuarlar</span>
                            <span className="text-slate-400 font-mono">({notificationsData?.criticalAccessories?.totalCount || 0})</span>
                          </div>

                          {!notificationsData?.criticalAccessories?.items?.length ? (
                            <p className="text-slate-400 italic text-[11px] py-1">Şu an bildirim yok</p>
                          ) : (
                            <div className="space-y-1.5">
                              {notificationsData.criticalAccessories.items.map((acc) => (
                                <div
                                  key={acc.id}
                                  onClick={() => {
                                    setPopoverOpen(false);
                                    navigate(`/accessories?accessoryId=${acc.id}`);
                                  }}
                                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#EAF2FC]/50 border border-slate-100 transition cursor-pointer flex items-center justify-between gap-2 group"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-[#1E2534] truncate group-hover:text-[#4F8FE0]">
                                      {acc.name}
                                    </p>
                                    {acc.brand && (
                                      <p className="text-[11px] text-slate-500 truncate">Marka: {acc.brand}</p>
                                    )}
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                                    Kalan: {acc.available} adet
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 3. Kritik Stoktaki Sarf Malzemeler */}
                        <div className="pt-3 space-y-2">
                          <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <span>Kritik Stoktaki Sarf Malzemeler</span>
                            <span className="text-slate-400 font-mono">({notificationsData?.criticalConsumables?.totalCount || 0})</span>
                          </div>

                          {!notificationsData?.criticalConsumables?.items?.length ? (
                            <p className="text-slate-400 italic text-[11px] py-1">Şu an bildirim yok</p>
                          ) : (
                            <div className="space-y-1.5">
                              {notificationsData.criticalConsumables.items.map((con) => (
                                <div
                                  key={con.id}
                                  onClick={() => {
                                    setPopoverOpen(false);
                                    navigate(`/consumables?consumableId=${con.id}`);
                                  }}
                                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#EAF2FC]/50 border border-slate-100 transition cursor-pointer flex items-center justify-between gap-2 group"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-[#1E2534] truncate group-hover:text-[#4F8FE0]">
                                      {con.name}
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                    Kalan: {con.available} adet
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs" style={{ backgroundColor: 'var(--theme-user-badge-bg)', color: 'var(--theme-user-badge-text)' }}>
                {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold truncate max-w-[140px]" style={{ color: 'var(--theme-text-primary)' }}>
                  {user?.fullName}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-accent)' }}>
                  {user?.role}
                </span>
              </div>

              <button
                onClick={clearAuth}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                title="Güvenli Çıkış"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            ></div>
            <div className="relative w-64 flex flex-col h-full shadow-2xl z-50" style={{ backgroundColor: 'var(--theme-sidebar-bg)', color: 'var(--theme-sidebar-text)' }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--theme-sidebar-border)' }}>
                <img src="/ditas-logo.png" alt="DİTAŞ Logo" className="h-14 w-auto max-w-[180px] object-contain" />
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto text-sm font-medium">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${isActive ? 'font-bold' : ''}`}
                      style={isActive
                        ? { backgroundColor: 'var(--theme-accent)', color: '#fff' }
                        : { color: 'var(--theme-sidebar-muted)' }
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {isAdmin && (
                  <>
                    <Link
                      to="/admin/users"
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${location.pathname.startsWith('/admin/users') ? 'font-bold' : ''}`}
                      style={location.pathname.startsWith('/admin/users')
                        ? { backgroundColor: 'var(--theme-accent)', color: '#fff' }
                        : { color: 'var(--theme-sidebar-muted)' }
                      }
                    >
                      <Users className="w-4 h-4" />
                      <span>Kullanıcı Yönetimi</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${location.pathname.startsWith('/settings') ? 'font-bold' : ''}`}
                      style={location.pathname.startsWith('/settings')
                        ? { backgroundColor: 'var(--theme-accent)', color: '#fff' }
                        : { color: 'var(--theme-sidebar-muted)' }
                      }
                    >
                      <Settings className="w-4 h-4" />
                      <span>Sistem Ayarları</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        )}

        {/* MAIN BODY CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  // Load saved theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('ditas-theme') || 'default';
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\S+/g, '')
      .trim();
    if (savedTheme !== 'default') {
      document.documentElement.classList.add(`theme-${savedTheme}`);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/force-change-password"
          element={
            <ProtectedRoute isForcePasswordRoute={true}>
              <ForceChangePasswordPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']}>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/assignments"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="assignments:view">
              <MainLayout>
                <AssignmentList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/assignments/create"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="assignments:create">
              <MainLayout>
                <CreateAssignmentPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/returns"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="returns:view">
              <MainLayout>
                <ReturnList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/returns/create"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="returns:create">
              <MainLayout>
                <CreateReturnPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/hardware"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="hardware:view">
              <MainLayout>
                <HardwareList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/licenses"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="licenses:view">
              <MainLayout>
                <LicenseList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/accessories"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="accessories:view">
              <MainLayout>
                <AccessoryList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/consumables"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="consumables:view">
              <MainLayout>
                <ConsumableList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/components"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="components:view">
              <MainLayout>
                <ComponentList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff']} requiredPermission="employees:view">
              <MainLayout>
                <EmployeeList />
              </MainLayout>
            </ProtectedRoute>
          }
        />


        {/* Backward compatibility redirects */}
        <Route path="/software" element={<Navigate to="/licenses" replace />} />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout>
                <UsersList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout>
                <SettingsLayout />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
