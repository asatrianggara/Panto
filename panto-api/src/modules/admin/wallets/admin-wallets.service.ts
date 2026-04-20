import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { ListWalletsQueryDto } from './admin-wallets.dto';
import { paginated } from '../common/pagination.dto';

@Injectable()
export class AdminWalletsService {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
  ) {}

  async list(query: ListWalletsQueryDto) {
    const { page = 1, limit = 20, provider, isActive, isRealLinked } = query;
    const sort =
      query.sort === 'balance' ? 'wallet.balance' : 'wallet.linkedAt';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';

    const qb = this.walletRepo
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.user', 'user');

    if (provider) qb.andWhere('wallet.provider = :provider', { provider });
    if (isActive != null)
      qb.andWhere('wallet.isActive = :isActive', {
        isActive: isActive === 'true' ? 1 : 0,
      });
    if (isRealLinked != null)
      qb.andWhere('wallet.isRealLinked = :real', {
        real: isRealLinked === 'true' ? 1 : 0,
      });

    const total = await qb.getCount();
    const wallets = await qb
      .orderBy(sort, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const items = wallets.map((w) => ({
      id: w.id,
      userId: w.userId,
      userName: w.user?.name ?? null,
      userPhone: w.user?.phoneNumber ?? null,
      provider: w.provider,
      providerPhone: w.providerPhone,
      balance: w.balance,
      isActive: w.isActive,
      inRouting: w.inRouting,
      isRealLinked: w.isRealLinked,
      lastSynced: w.lastSynced,
      linkedAt: w.linkedAt,
    }));

    return paginated(items, page, limit, total);
  }

  async summary() {
    const rows = await this.walletRepo
      .createQueryBuilder('w')
      .select('w.provider', 'provider')
      .addSelect('COUNT(*)', 'walletCount')
      .addSelect(
        'SUM(CASE WHEN w.isActive = 1 THEN 1 ELSE 0 END)',
        'activeCount',
      )
      .addSelect('COALESCE(SUM(w.balance), 0)', 'totalBalance')
      .addSelect(
        'SUM(CASE WHEN w.isRealLinked = 1 THEN 1 ELSE 0 END)',
        'realLinkedCount',
      )
      .groupBy('w.provider')
      .getRawMany<{
        provider: string;
        walletCount: string;
        activeCount: string;
        totalBalance: string;
        realLinkedCount: string;
      }>();

    const byProvider = rows.map((r) => ({
      provider: r.provider,
      walletCount: Number(r.walletCount),
      activeCount: Number(r.activeCount),
      totalBalance: Number(r.totalBalance),
      realLinkedCount: Number(r.realLinkedCount),
    }));

    const totals = byProvider.reduce(
      (acc, r) => ({
        walletCount: acc.walletCount + r.walletCount,
        activeCount: acc.activeCount + r.activeCount,
        totalBalance: acc.totalBalance + r.totalBalance,
      }),
      { walletCount: 0, activeCount: 0, totalBalance: 0 },
    );

    return { byProvider, totals };
  }
}
