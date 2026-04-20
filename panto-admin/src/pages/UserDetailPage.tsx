import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Receipt, User, Wallet } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ProviderBadge,
  TierBadge,
  TxStatusBadge,
  UserStatusBadge,
} from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { formatDate, formatIDR, formatRelative } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import {
  fetchUser,
  fetchUserActivity,
  fetchUserTransactions,
  fetchUserWallets,
} from '@/api/endpoints';

type Tab = 'profile' | 'wallets' | 'transactions' | 'activity';

export function UserDetailPage() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<Tab>('profile');

  const userQ = useAsync(() => fetchUser(id), [id]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/users"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
      </div>

      {userQ.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {userQ.error}
        </div>
      )}

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          {userQ.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-60" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            userQ.data && (
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary grid place-items-center text-xl font-semibold">
                  {userQ.data.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold truncate">
                      {userQ.data.name}
                    </h1>
                    <TierBadge tier={userQ.data.tier} />
                    <UserStatusBadge isActive={userQ.data.isActive} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {userQ.data.phoneNumber}
                    {userQ.data.email ? ` · ${userQ.data.email}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Joined {formatDate(userQ.data.createdAt)}
                  </div>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {userQ.data && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCell
            label="Wallets"
            value={`${userQ.data.stats.activeWalletCount} / ${userQ.data.stats.walletCount}`}
          />
          <StatCell
            label="Total Balance"
            value={formatIDR(userQ.data.stats.totalBalance)}
          />
          <StatCell
            label="Transactions"
            value={`${userQ.data.stats.successfulTransactions} / ${userQ.data.stats.transactionCount}`}
          />
          <StatCell
            label="Total Spent"
            value={formatIDR(userQ.data.stats.totalSpent)}
          />
        </section>
      )}

      {/* Tabs */}
      <div className="border-b flex gap-1 overflow-x-auto">
        {(
          [
            { k: 'profile', label: 'Profile', icon: User },
            { k: 'wallets', label: 'Wallets', icon: Wallet },
            { k: 'transactions', label: 'Transactions', icon: Receipt },
            { k: 'activity', label: 'Activity', icon: Clock },
          ] as Array<{
            k: Tab;
            label: string;
            icon: typeof User;
          }>
        ).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === k
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && userQ.data && <ProfileTab user={userQ.data} />}
      {tab === 'wallets' && <WalletsTab userId={id} />}
      {tab === 'transactions' && <TransactionsTab userId={id} />}
      {tab === 'activity' && <ActivityTab userId={id} />}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function ProfileTab({
  user,
}: {
  user: import('@/types').UserDetail;
}) {
  const rows: Array<[string, string | null]> = [
    ['User ID', user.id],
    ['Name', user.name],
    ['Phone', user.phoneNumber],
    ['Email', user.email],
    ['Tier', user.tier],
    ['Status', user.isActive ? 'Active' : 'Suspended'],
    ['Created', formatDate(user.createdAt)],
    ['Updated', formatDate(user.updatedAt)],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-sm font-medium break-all">
                {v ?? '—'}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function WalletsTab({ userId }: { userId: string }) {
  const { data, error, loading } = useAsync(
    () => fetchUserWallets(userId),
    [userId]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Linked wallets</CardTitle>
        <CardDescription>All e-money providers connected.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {error && <div className="p-4 text-sm text-destructive">{error}</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Linked</TableHead>
              <TableHead>Last synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <RowSkeleton rows={3} cols={6} />}
            {!loading && data?.items.length === 0 && (
              <EmptyRow cols={6} message="No wallets linked yet." />
            )}
            {!loading &&
              data?.items.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <ProviderBadge provider={w.provider} />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {w.providerPhone}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatIDR(w.balance)}
                  </TableCell>
                  <TableCell>
                    {w.isActive ? (
                      <span className="text-emerald-600 text-sm">Active</span>
                    ) : (
                      <span className="text-destructive text-sm">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(w.linkedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {w.lastSynced ? formatRelative(w.lastSynced) : '—'}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TransactionsTab({ userId }: { userId: string }) {
  const { data, error, loading } = useAsync(
    () => fetchUserTransactions(userId),
    [userId]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent transactions</CardTitle>
        <CardDescription>Last 50 transactions, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {error && <div className="p-4 text-sm text-destructive">{error}</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <RowSkeleton rows={4} cols={4} />}
            {!loading && data?.items.length === 0 && (
              <EmptyRow cols={4} message="No transactions yet." />
            )}
            {!loading &&
              data?.items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      to={`/transactions/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.merchantName ?? t.type}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIDR(t.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <TxStatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ActivityTab({ userId }: { userId: string }) {
  const { data, error, loading } = useAsync(
    () => fetchUserActivity(userId),
    [userId]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {!loading && data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
        {!loading && data && (
          <ol className="relative space-y-4 border-l pl-5 ml-1">
            {data.items.map((e, i) => (
              <li key={`${e.refId}-${i}`}>
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                <div className="text-sm">{e.summary}</div>
                <div className="text-xs text-muted-foreground">
                  {formatRelative(e.timestamp)} · {formatDate(e.timestamp)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function RowSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 w-full max-w-[140px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={cols}
        className="text-center text-sm text-muted-foreground py-8"
      >
        {message}
      </TableCell>
    </TableRow>
  );
}
