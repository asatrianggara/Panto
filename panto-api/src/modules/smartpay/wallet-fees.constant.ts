export interface WalletFeeInfo {
  toBank: number;
  toOtherEwallet: number;
  p2pSame: number;
}

export const WALLET_FEES: Record<string, WalletFeeInfo> = {
  gopay: { toBank: 2500, toOtherEwallet: 2500, p2pSame: 0 },
  ovo: { toBank: 2500, toOtherEwallet: 2500, p2pSame: 0 },
  dana: { toBank: 2500, toOtherEwallet: 2500, p2pSame: 0 },
  shopeepay: { toBank: 1500, toOtherEwallet: 1500, p2pSame: 0 },
  linkaja: { toBank: 1000, toOtherEwallet: 1000, p2pSame: 0 },
};

export function getManualConsolidationCost(providers: string[]): number {
  if (providers.length <= 1) return 0;
  const sorted = [...providers].sort(
    (a, b) => (WALLET_FEES[b]?.toBank || 0) - (WALLET_FEES[a]?.toBank || 0),
  );
  const secondaryWallets = sorted.slice(1);
  return secondaryWallets.reduce(
    (sum, p) => sum + (WALLET_FEES[p]?.toBank || 0),
    0,
  );
}
