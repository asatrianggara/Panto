import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CalculateSplitDto } from './dto/calculate-split.dto';
import { getManualConsolidationCost } from './wallet-fees.constant';

interface WalletScore {
  wallet: Wallet;
  score: number;
}

interface SplitResult {
  walletId: string;
  provider: string;
  amount: number;
  percentage: number;
  fee: number;
  promoSaving: number;
}

@Injectable()
export class SmartpayService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async calculateSplit(userId: string, dto: CalculateSplitDto) {
    const wallets = await this.walletRepo.find({
      where: { userId, isActive: true, inRouting: true },
    });

    if (wallets.length === 0) {
      throw new BadRequestException('No active wallets available for routing');
    }

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    if (totalBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient total balance. Available: Rp ${totalBalance.toLocaleString()}, Required: Rp ${dto.amount.toLocaleString()}`,
      );
    }

    const scored: WalletScore[] = wallets.map((wallet) => {
      const promoBonus = this.getPromoValue(wallet.provider, dto.merchantCategory) * 100;
      const balanceRatio = (wallet.balance / totalBalance) * 50;
      const feePenalty = wallet.transferFee * -10;
      const score = promoBonus + balanceRatio + feePenalty;
      return { wallet, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const splits: SplitResult[] = [];
    let remaining = dto.amount;

    for (let i = 0; i < scored.length && remaining > 0; i++) {
      const { wallet } = scored[i];
      const allocate = Math.min(wallet.balance, remaining);

      if (allocate < 1000 && remaining - allocate !== 0) {
        continue;
      }

      splits.push({
        walletId: wallet.id,
        provider: wallet.provider,
        amount: allocate,
        percentage: Math.round((allocate / dto.amount) * 100),
        fee: wallet.transferFee,
        promoSaving: this.getPromoValue(wallet.provider, dto.merchantCategory),
      });

      remaining -= allocate;
    }

    if (remaining > 0) {
      throw new BadRequestException('Could not allocate full amount across wallets');
    }

    const totalFee = splits.reduce((sum, s) => sum + s.fee, 0);
    const totalPromoSaving = splits.reduce((sum, s) => sum + s.promoSaving, 0);
    const manualTransferSaving = getManualConsolidationCost(
      splits.map((s) => s.provider),
    );
    const totalSaving = totalPromoSaving + manualTransferSaving;

    return {
      amount: dto.amount,
      merchantName: dto.merchantName,
      merchantCategory: dto.merchantCategory || null,
      splits,
      summary: {
        totalAmount: dto.amount,
        totalFee,
        totalSaving,
        manualTransferSaving,
        totalPromoSaving,
        walletsUsed: splits.length,
      },
    };
  }

  async validateSplits(
    userId: string,
    splits: { walletId: string; amount: number }[],
    totalAmount: number,
  ) {
    const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
    if (splitSum !== totalAmount) {
      throw new BadRequestException(
        `Splits sum (${splitSum}) does not equal total amount (${totalAmount})`,
      );
    }

    const errors: string[] = [];
    for (const split of splits) {
      const wallet = await this.walletRepo.findOne({
        where: { id: split.walletId, userId },
      });
      if (!wallet) {
        errors.push(`Wallet ${split.walletId} not found`);
        continue;
      }
      if (!wallet.isActive) {
        errors.push(`Wallet ${wallet.provider} is inactive`);
      }
      if (wallet.balance < split.amount) {
        errors.push(
          `Wallet ${wallet.provider} has insufficient balance (${wallet.balance} < ${split.amount})`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getPromoValue(provider: string, category?: string): number {
    const promos: Record<string, Record<string, number>> = {
      gopay: { food: 5000, transport: 3000 },
      ovo: { food: 3000, shopping: 5000 },
      dana: { bills: 5000, shopping: 2000 },
      shopeepay: { shopping: 8000, food: 2000 },
      linkaja: { transport: 5000, bills: 3000 },
    };

    if (!category || !promos[provider]) return 0;
    return promos[provider][category.toLowerCase()] || 0;
  }
}
