import {
  AlertTriangle,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { fetchDashboardOverview } from '@/api/endpoints';
import { useAsync } from '@/lib/useAsync';
import { formatIDR, formatNumber } from '@/lib/format';

export function DashboardPage() {
  const admin = useAuthStore((s) => s.admin);
  const { data, error, loading } = useAsync(fetchDashboardOverview, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {admin?.email}. Here's what's happening today.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={loading ? null : formatNumber(data?.totalUsers)}
          hint={
            data ? `${formatNumber(data.activeUsers)} active` : undefined
          }
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Active Wallets"
          value={loading ? null : formatNumber(data?.activeWallets)}
          hint={
            data ? `of ${formatNumber(data.totalWallets)} total` : undefined
          }
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Transactions Today"
          value={loading ? null : formatNumber(data?.transactionsToday)}
          hint={
            data ? formatIDR(data.transactionVolumeToday) + ' volume' : undefined
          }
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="New Users Today"
          value={loading ? null : formatNumber(data?.newUsersToday)}
          icon={<UserPlus className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Today's Volume
            </CardTitle>
            <CardDescription>Successful transaction value</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-48" />
            ) : (
              <div className="text-3xl font-semibold">
                {formatIDR(data?.transactionVolumeToday)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Failed Today
            </CardTitle>
            <CardDescription>Needs investigation</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-3xl font-semibold">
                {formatNumber(data?.failedTransactionsToday)}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | null;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
