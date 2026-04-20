import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
import { ProviderBadge, TxStatusBadge } from '@/components/ui/status-badge';
import { fetchTransaction } from '@/api/endpoints';
import { useAsync } from '@/lib/useAsync';
import { formatDate, formatIDR } from '@/lib/format';

export function TransactionDetailPage() {
  const { id = '' } = useParams();
  const { data, error, loading } = useAsync(
    () => fetchTransaction(id),
    [id]
  );

  return (
    <div className="space-y-6">
      <Link
        to="/transactions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to transactions
      </Link>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          {loading ? (
            <>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </>
          ) : data ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl">
                    {data.merchantName ?? data.type}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {data.merchantCategory ?? '—'} · {formatDate(data.createdAt)}
                  </CardDescription>
                </div>
                <TxStatusBadge status={data.status} />
              </div>
            </>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}
          {data && (
            <div className="grid gap-4 md:grid-cols-3">
              <Amount label="Total amount" value={data.totalAmount} big />
              <Amount
                label="Total fee"
                value={data.totalFee}
                tone="muted"
              />
              <Amount
                label="Savings"
                value={data.totalSaving}
                tone="positive"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User</CardTitle>
              </CardHeader>
              <CardContent>
                {data.user ? (
                  <>
                    <Link
                      to={`/users/${data.user.id}`}
                      className="font-medium hover:underline"
                    >
                      {data.user.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {data.user.phoneNumber}
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <Row label="Transaction ID" value={data.id} mono />
                <Row label="Idempotency key" value={data.idempotencyKey} mono />
                <Row label="Type" value={data.type} />
                <Row
                  label="Points earned"
                  value={data.pointsEarned.toString()}
                />
                <Row
                  label="Completed at"
                  value={data.completedAt ? formatDate(data.completedAt) : '—'}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Splits</CardTitle>
              <CardDescription>
                How the payment was routed across wallets.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.splits.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        No splits recorded.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.splits.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <ProviderBadge provider={s.provider} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatIDR(s.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatIDR(s.fee)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">
                        {s.promoSaving > 0
                          ? '-' + formatIDR(s.promoSaving)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <TxStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.processedAt ? formatDate(s.processedAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Amount({
  label,
  value,
  big,
  tone,
}: {
  label: string;
  value: number;
  big?: boolean;
  tone?: 'muted' | 'positive';
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={[
          'mt-1 font-semibold tabular-nums',
          big ? 'text-2xl' : 'text-lg',
          tone === 'muted' ? 'text-muted-foreground' : '',
          tone === 'positive' ? 'text-emerald-600' : '',
        ].join(' ')}
      >
        {tone === 'positive' && value > 0 ? '-' : ''}
        {formatIDR(value)}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs break-all' : 'break-all'}>
        {value}
      </span>
    </div>
  );
}
