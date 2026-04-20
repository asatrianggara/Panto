import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { ListUsersQueryDto } from './admin-users.dto';
import { paginated } from '../common/pagination.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async list(query: ListUsersQueryDto) {
    const { page = 1, limit = 20, q, tier, isActive } = query;
    const sort = query.sort === 'name' ? 'user.name' : 'user.createdAt';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';

    const qb = this.userRepo.createQueryBuilder('user');

    if (q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('user.name LIKE :q', { q: `%${q}%` }).orWhere(
            'user.phoneNumber LIKE :q',
            { q: `%${q}%` },
          );
        }),
      );
    }
    if (tier) qb.andWhere('user.tier = :tier', { tier });
    if (isActive != null) {
      qb.andWhere('user.isActive = :isActive', {
        isActive: isActive === 'true' ? 1 : 0,
      });
    }

    const total = await qb.getCount();
    const users = await qb
      .orderBy(sort, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const userIds = users.map((u) => u.id);
    const counts = userIds.length
      ? await this.walletRepo
          .createQueryBuilder('wallet')
          .select('wallet.userId', 'userId')
          .addSelect('COUNT(*)', 'cnt')
          .where('wallet.userId IN (:...ids)', { ids: userIds })
          .groupBy('wallet.userId')
          .getRawMany<{ userId: string; cnt: string }>()
      : [];
    const countMap = new Map(counts.map((c) => [c.userId, Number(c.cnt)]));

    const items = users.map((u) => ({
      id: u.id,
      phoneNumber: u.phoneNumber,
      name: u.name,
      email: u.email,
      tier: u.tier,
      isActive: u.isActive,
      walletCount: countMap.get(u.id) ?? 0,
      createdAt: u.createdAt,
    }));

    return paginated(items, page, limit, total);
  }

  async detail(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const [walletStats, txStats] = await Promise.all([
      this.walletRepo
        .createQueryBuilder('w')
        .select('COUNT(*)', 'count')
        .addSelect(
          'SUM(CASE WHEN w.isActive = 1 THEN 1 ELSE 0 END)',
          'activeCount',
        )
        .addSelect('COALESCE(SUM(w.balance), 0)', 'totalBalance')
        .where('w.userId = :id', { id })
        .getRawOne<{
          count: string;
          activeCount: string;
          totalBalance: string;
        }>(),
      this.txRepo
        .createQueryBuilder('t')
        .select('COUNT(*)', 'count')
        .addSelect(
          "SUM(CASE WHEN t.status = 'success' THEN 1 ELSE 0 END)",
          'successful',
        )
        .addSelect(
          "COALESCE(SUM(CASE WHEN t.status = 'success' THEN t.totalAmount ELSE 0 END), 0)",
          'totalSpent',
        )
        .where('t.userId = :id', { id })
        .getRawOne<{ count: string; successful: string; totalSpent: string }>(),
    ]);

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      email: user.email ?? null,
      avatarUrl: user.avatarUrl ?? null,
      tier: user.tier,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: {
        walletCount: Number(walletStats?.count ?? 0),
        activeWalletCount: Number(walletStats?.activeCount ?? 0),
        totalBalance: Number(walletStats?.totalBalance ?? 0),
        transactionCount: Number(txStats?.count ?? 0),
        successfulTransactions: Number(txStats?.successful ?? 0),
        totalSpent: Number(txStats?.totalSpent ?? 0),
      },
    };
  }

  async wallets(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const wallets = await this.walletRepo.find({
      where: { userId: id },
      order: { linkedAt: 'DESC' },
    });

    return {
      items: wallets.map((w) => ({
        id: w.id,
        provider: w.provider,
        providerPhone: w.providerPhone,
        balance: w.balance,
        isActive: w.isActive,
        inRouting: w.inRouting,
        isRealLinked: w.isRealLinked,
        lastSynced: w.lastSynced,
        linkedAt: w.linkedAt,
      })),
    };
  }

  async transactions(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const txs = await this.txRepo.find({
      where: { userId: id },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      items: txs.map((t) => ({
        id: t.id,
        type: t.type,
        merchantName: t.merchantName,
        totalAmount: t.totalAmount,
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  }

  async activity(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const [txs, wallets] = await Promise.all([
      this.txRepo.find({
        where: { userId: id },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.walletRepo.find({ where: { userId: id } }),
    ]);

    const events = [
      ...txs.map((t) => ({
        type: 'transaction' as const,
        timestamp: t.createdAt,
        summary: `${t.status === 'success' ? 'Paid' : t.status} Rp${t.totalAmount.toLocaleString('id-ID')}${
          t.merchantName ? ` to ${t.merchantName}` : ''
        }`,
        refId: t.id,
      })),
      ...wallets.map((w) => ({
        type: 'wallet_linked' as const,
        timestamp: w.linkedAt,
        summary: `Linked ${w.provider.toUpperCase()} wallet`,
        refId: w.id,
      })),
    ];

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return { items: events.slice(0, 50) };
  }
}
