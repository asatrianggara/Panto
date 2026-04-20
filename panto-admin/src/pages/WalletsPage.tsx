import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { ProviderBadge } from '@/components/ui/status-badge';
import { fetchWallets, fetchWalletsSummary } from '@/api/endpoints';
import { useAsync } from '@/lib/useAsync';
import { formatDate, formatIDR, formatNumber } from '@/lib/format';

export function WalletsPage() {
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState('');
  const [active, setActive] = useState('');
  const [real, setReal] = useState('');

  const summary = useAsync(fetchWalletsSummary, []);
  const list = useAsync(
    () =>
      fetchWallets({
        page,
        limit: 20,
        provider: provider || undefined,
        isActive: active || undefined,
        isRealLinked: real || undefined,
      }),
    [page, provider, active, real]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallets</h1>
        <p className="text-sm text-muted-foreground">
          Global e-money wallet overview across all users.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Wallets</CardDescription>
            <CardTitle className="text-2xl">
              {summary.loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatNumber(summary.data?.totals.walletCount)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Wallets</CardDescription>
            <CardTitle className="text-2xl">
              {summary.loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatNumber(summary.data?.totals.activeCount)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Liquidity</CardDescription>
            <CardTitle className="text-2xl">
              {summary.loading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                formatIDR(summary.data?.totals.totalBalance)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By provider</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Wallets</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Real-linked</TableHead>
                <TableHead className="text-right">Liquidity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.loading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!summary.loading &&
                summary.data?.byProvider.map((p) => (
                  <TableRow key={p.provider}>
                    <TableCell>
                      <ProviderBadge provider={p.provider} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(p.walletCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(p.activeCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(p.realLinkedCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatIDR(p.totalBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              {!summary.loading &&
                (summary.data?.byProvider.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-sm text-muted-foreground py-6"
                    >
                      No wallet data yet.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All wallets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All providers</option>
              <option value="gopay">GoPay</option>
              <option value="ovo">OVO</option>
              <option value="dana">DANA</option>
              <option value="shopeepay">ShopeePay</option>
              <option value="linkaja">LinkAja</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={active}
              onChange={(e) => {
                setActive(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={real}
              onChange={(e) => {
                setReal(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any linkage</option>
              <option value="true">Real-linked only</option>
              <option value="false">Mock only</option>
            </select>
          </div>

          <div className="rounded-md border">
            {list.error && (
              <div className="p-4 text-sm text-destructive">{list.error}</div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Real</TableHead>
                  <TableHead>Linked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.loading && (
                  <>
                    {Array.from({ length: 5 }).map((_, r) => (
                      <TableRow key={r}>
                        {Array.from({ length: 5 }).map((_, c) => (
                          <TableCell key={c}>
                            <Skeleton className="h-4 w-full max-w-[120px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                )}
                {!list.loading && list.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      No wallets match.
                    </TableCell>
                  </TableRow>
                )}
                {!list.loading &&
                  list.data?.items.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <Link
                          to={`/users/${w.userId}`}
                          className="font-medium hover:underline"
                        >
                          {w.userName ?? '—'}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {w.userPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProviderBadge provider={w.provider} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatIDR(w.balance)}
                      </TableCell>
                      <TableCell>
                        {w.isRealLinked ? (
                          <span className="text-emerald-600 text-sm">
                            Real
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Mock
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(w.linkedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {list.data && (
            <Pagination
              page={list.data.page}
              limit={list.data.limit}
              total={list.data.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
