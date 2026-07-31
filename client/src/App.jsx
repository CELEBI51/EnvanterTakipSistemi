import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import ForceChangePasswordPage from './features/auth/pages/ForceChangePasswordPage';
import UsersList from './features/admin/users/UsersList';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import HardwareList from './features/hardware/pages/HardwareList';
import SoftwareList from './features/software/pages/SoftwareList';
import AccessoryList from './features/accessories/pages/AccessoryList';
import useAuthStore from './store/authStore';
import {
  Tag,
  Users,
  LayoutDashboard,
  Boxes,
  Monitor,
  Headphones,
  Key,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

function ProtectedRoute({ children, allowedRoles, isForcePasswordRoute = false }) {
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

  if (allowedRoles && !allowedRoles.includes(user?.role?.toLowerCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function MainLayout({ children }) {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  const isInventoryActive =
    location.pathname.startsWith('/hardware') || location.pathname.startsWith('/accessories');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setInventoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setInventoryOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans">
      {/* Üst Kurumsal Header */}
      <header className="bg-[#1E2534] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#4F8FE0] text-white flex items-center justify-center font-bold shadow-xs">
                <Tag className="w-4 h-4" />
              </div>
              <span className="font-heading text-base font-bold text-white tracking-tight hidden sm:inline">
                Demirbaş Takip Sistemi
              </span>
            </Link>

            {/* Masaüstü Navigasyon Tabları */}
            <nav className="hidden md:flex items-center gap-1.5">
              {/* Genel Bakış */}
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-[#4F8FE0] text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Genel Bakış</span>
              </Link>

              {/* Envanter (Açılır Grup) */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setInventoryOpen((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isInventoryActive
                      ? 'bg-[#4F8FE0] text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Envanter</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      inventoryOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {inventoryOpen && (
                  <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-slate-800 animate-fade-in">
                    <Link
                      to="/hardware"
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold hover:bg-[#F0F4F8] transition-colors ${
                        location.pathname.startsWith('/hardware')
                          ? 'text-[#4F8FE0] bg-[#EAF2FC] font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      <Monitor className="w-4 h-4 text-[#4F8FE0]" />
                      <span>Bilgisayar & Ekipman</span>
                    </Link>
                    <Link
                      to="/accessories"
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold hover:bg-[#F0F4F8] transition-colors ${
                        location.pathname.startsWith('/accessories')
                          ? 'text-[#4F8FE0] bg-[#EAF2FC] font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      <Headphones className="w-4 h-4 text-[#4F8FE0]" />
                      <span>Aksesuarlar</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Yazılımlar */}
              <Link
                to="/software"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  location.pathname.startsWith('/software')
                    ? 'bg-[#4F8FE0] text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Yazılımlar</span>
              </Link>

              {/* Kullanıcı Yönetimi */}
              {isAdmin && (
                <Link
                  to="/admin/users"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/admin/users')
                      ? 'bg-[#4F8FE0] text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Kullanıcı Yönetimi</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Sağ Kullanıcı Bilgisi ve Mobil Menü Butonu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{user?.fullName}</span>
              <span className="text-[10px] text-[#4F8FE0] font-bold uppercase">{user?.role}</span>
            </div>

            <button
              onClick={clearAuth}
              className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobil Menü Butonu */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobil Menü Çekmecesi */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1E2534] border-b border-slate-800 px-4 pt-2 pb-4 space-y-2 text-xs">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 p-2.5 rounded-lg font-semibold ${
                location.pathname === '/dashboard' ? 'bg-[#4F8FE0] text-white' : 'text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Genel Bakış</span>
            </Link>

            <div className="space-y-1 pl-2 border-l-2 border-slate-700 my-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">
                Envanter
              </span>
              <Link
                to="/hardware"
                className={`flex items-center gap-2 p-2 rounded-lg font-semibold ${
                  location.pathname.startsWith('/hardware') ? 'bg-[#4F8FE0] text-white' : 'text-slate-300'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Bilgisayar & Ekipman</span>
              </Link>
              <Link
                to="/accessories"
                className={`flex items-center gap-2 p-2 rounded-lg font-semibold ${
                  location.pathname.startsWith('/accessories') ? 'bg-[#4F8FE0] text-white' : 'text-slate-300'
                }`}
              >
                <Headphones className="w-4 h-4" />
                <span>Aksesuarlar</span>
              </Link>
            </div>

            <Link
              to="/software"
              className={`flex items-center gap-2 p-2.5 rounded-lg font-semibold ${
                location.pathname.startsWith('/software') ? 'bg-[#4F8FE0] text-white' : 'text-slate-300'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Yazılımlar</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin/users"
                className={`flex items-center gap-2 p-2.5 rounded-lg font-semibold ${
                  location.pathname.startsWith('/admin/users') ? 'bg-[#4F8FE0] text-white' : 'text-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Kullanıcı Yönetimi</span>
              </Link>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">{user?.fullName}</div>
                <div className="text-[10px] text-[#4F8FE0] font-bold uppercase">{user?.role}</div>
              </div>
              <button
                onClick={clearAuth}
                className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold"
              >
                <LogOut className="w-4 h-4" />
                <span>Çıkış</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Ana İçerik */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

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
            <ProtectedRoute allowedRoles={['admin', 'it_staff', 'viewer']}>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/hardware"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff', 'viewer']}>
              <MainLayout>
                <HardwareList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/accessories"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff', 'viewer']}>
              <MainLayout>
                <AccessoryList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/software"
          element={
            <ProtectedRoute allowedRoles={['admin', 'it_staff', 'viewer']}>
              <MainLayout>
                <SoftwareList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

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

        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
