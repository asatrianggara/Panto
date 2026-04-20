import { Badge } from './badge';

type TxStatus = 'pending' | 'processing' | 'success' | 'failed' | string;

export function TxStatusBadge({ status }: { status: TxStatus }) {
  switch (status) {
    case 'success':
      return <Badge variant="success">Success</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'processing':
      return <Badge variant="warning">Processing</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="destructive">Suspended</Badge>
  );
}

export function TierBadge({ tier }: { tier: 'free' | 'plus' | string }) {
  return tier === 'plus' ? (
    <Badge variant="default">Plus</Badge>
  ) : (
    <Badge variant="outline">Free</Badge>
  );
}

const PROVIDER_COLORS: Record<string, string> = {
  gopay: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  ovo: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  dana: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  shopeepay:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  linkaja: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function ProviderBadge({ provider }: { provider: string }) {
  const cls =
    PROVIDER_COLORS[provider] ?? 'bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${cls}`}
    >
      {provider}
    </span>
  );
}
