import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import ForceChangePasswordPage from './features/auth/pages/ForceChangePasswordPage';
import UsersList from './features/admin/users/UsersList';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import HardwareList from './features/hardware/pages/HardwareList';
import SoftwareList from './features/software/pages/SoftwareList';
import useAuthStore from './store/authStore';
import { Tag, Users, LayoutDashboard, Package, Key, LogOut } from 'lucide-react';

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

  const isAdmin = user?.role === 'admin';

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

            {/* Navigasyon Tabları */}
            <nav className="flex items-center gap-1 sm:gap-2">
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

              <Link
                to="/hardware"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  location.pathname.startsWith('/hardware')
                    ? 'bg-[#4F8FE0] text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Donanımlar</span>
              </Link>

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

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{user?.fullName}</span>
              <span className="text-[10px] text-[#4F8FE0] font-bold uppercase">{user?.role}</span>
            </div>
            <button
              onClick={clearAuth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
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
