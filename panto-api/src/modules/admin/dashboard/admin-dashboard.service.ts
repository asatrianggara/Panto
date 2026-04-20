import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async overview() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalWallets,
      activeWallets,
      transactionsToday,
      volumeTodayRaw,
      failedToday,
      newUsersToday,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { isActive: true } }),
      this.walletRepo.count(),
      this.walletRepo.count({ where: { isActive: true } }),
      this.txRepo
        .createQueryBuilder('t')
        .where('t.createdAt >= :start', { start: startOfDay })
        .getCount(),
      this.txRepo
        .createQueryBuilder('t')
        .select("COALESCE(SUM(t.totalAmount), 0)", 'sum')
        .where('t.createdAt >= :start', { start: startOfDay })
        .andWhere("t.status = 'success'")
        .getRawOne<{ sum: string }>(),
      this.txRepo
        .createQueryBuilder('t')
        .where('t.createdAt >= :start', { start: startOfDay })
        .andWhere("t.status = 'failed'")
        .getCount(),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :start', { start: startOfDay })
        .getCount(),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalWallets,
      activeWallets,
      transactionsToday,
      transactionVolumeToday: Number(volumeTodayRaw?.sum ?? 0),
      failedTransactionsToday: failedToday,
      newUsersToday,
    };
  }
}
