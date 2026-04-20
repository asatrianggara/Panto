import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { TierBadge, UserStatusBadge } from '@/components/ui/status-badge';
import { fetchUsers } from '@/api/endpoints';
import { useAsync } from '@/lib/useAsync';
import { useDebounce } from '@/lib/useDebounce';
import { formatDate, formatNumber } from '@/lib/format';

export function UsersListPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<'' | 'free' | 'plus'>('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const debounced = useDebounce(q, 300);

  const { data, error, loading } = useAsync(
    () =>
      fetchUsers({
        page,
        limit: 20,
        q: debounced || undefined,
        tier: tier || undefined,
        isActive: active || undefined,
      }),
    [page, debounced, tier, active]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search and inspect registered users.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone…"
              className="pl-9"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value as typeof tier);
              setPage(1);
            }}
          >
            <option value="">All tiers</option>
            <option value="free">Free</option>
            <option value="plus">Plus</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={active}
            onChange={(e) => {
              setActive(e.target.value as typeof active);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 text-sm text-destructive">{error}</div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Wallets</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <SkeletonRows cols={6} rows={6} />}
              {!loading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                data?.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        to={`/users/${u.id}`}
                        className="font-medium hover:underline"
                      >
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {u.phoneNumber}
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={u.tier} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge isActive={u.isActive} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(u.walletCount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && (
        <Pagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
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
