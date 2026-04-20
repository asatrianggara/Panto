import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { AdminRole } from '@/types';

interface Props {
  children: ReactNode;
  allow?: AdminRole[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const location = useLocation();
  const { isAuthenticated, admin } = useAuthStore();

  if (!isAuthenticated || !admin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allow && !allow.includes(admin.role)) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-center px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="text-muted-foreground text-sm">
            Your role ({admin.role}) does not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
