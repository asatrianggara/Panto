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
import { TxStatusBadge } from '@/components/ui/status-badge';
import { fetchTransactions } from '@/api/endpoints';
import { useAsync } from '@/lib/useAsync';
import { useDebounce } from '@/lib/useDebounce';
import { formatDate, formatIDR } from '@/lib/format';

export function TransactionsListPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounced = useDebounce(q, 300);

  const { data, error, loading } = useAsync(
    () =>
      fetchTransactions({
        page,
        limit: 20,
        q: debounced || undefined,
        status: status || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo
          ? new Date(dateTo + 'T23:59:59').toISOString()
          : undefined,
      }),
    [page, debounced, status, dateFrom, dateTo]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          All payment transactions across the platform.
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
              placeholder="Search merchant or user phone…"
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
          </select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
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
                <TableHead>Merchant</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Saved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <>
                  {Array.from({ length: 6 }).map((_, r) => (
                    <TableRow key={r}>
                      {Array.from({ length: 6 }).map((_, c) => (
                        <TableCell key={c}>
                          <Skeleton className="h-4 w-full max-w-[140px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              )}
              {!loading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
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
                      {t.merchantCategory && (
                        <div className="text-xs text-muted-foreground">
                          {t.merchantCategory}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/users/${t.userId}`}
                        className="text-sm hover:underline"
                      >
                        {t.userName ?? '—'}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {t.userPhone}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatIDR(t.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      {t.totalSaving > 0
                        ? '-' + formatIDR(t.totalSaving)
                        : '—'}
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
