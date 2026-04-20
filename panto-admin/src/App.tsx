import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersListPage } from '@/pages/UsersListPage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { WalletsPage } from '@/pages/WalletsPage';
import { TransactionsListPage } from '@/pages/TransactionsListPage';
import { TransactionDetailPage } from '@/pages/TransactionDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';

function LoginGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginGate />} />

        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersListPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="wallets" element={<WalletsPage />} />
          <Route path="transactions" element={<TransactionsListPage />} />
          <Route path="transactions/:id" element={<TransactionDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
