import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ApiError } from '../lib/api-client';
import { AuthProvider } from '../features/auth/auth-context';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { AssetListPage } from '../features/assets/AssetListPage';
import { ConsumableListPage } from '../features/consumables/ConsumableListPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { StaffListPage } from '../features/staff/StaffListPage';
import { AppLayout } from './layout/AppLayout';
import { RequireAuth } from './RequireAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Intranette ag hizli; yine de gereksiz istegi engelle.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Yetki/dogrulama hatalarini tekrar denemek anlamsiz.
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/giris" element={<LoginPage />} />
            <Route path="/parola-degistir" element={<ChangePasswordPage />} />

            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/personel" element={<StaffListPage />} />
              <Route path="/demirbaslar" element={<AssetListPage />} />
              <Route path="/aksesuarlar" element={<ConsumableListPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
