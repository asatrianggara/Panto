import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { TransactionSplit } from '../../transactions/entities/transaction-split.entity';
import { User } from '../../users/entities/user.entity';
import { ListTransactionsQueryDto } from './admin-transactions.dto';
import { paginated } from '../common/pagination.dto';

@Injectable()
export class AdminTransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionSplit)
    private readonly splitRepo: Repository<TransactionSplit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async list(query: ListTransactionsQueryDto) {
    const {
      page = 1,
      limit = 20,
      q,
      status,
      userId,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
    } = query;
    const sort =
      query.sort === 'totalAmount' ? 'tx.totalAmount' : 'tx.createdAt';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .leftJoin(User, 'user', 'user.id = tx.userId')
      .addSelect(['user.id', 'user.name', 'user.phoneNumber']);

    if (q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('tx.merchantName LIKE :q', { q: `%${q}%` }).orWhere(
            'user.phoneNumber LIKE :q',
            { q: `%${q}%` },
          );
        }),
      );
    }
    if (status) qb.andWhere('tx.status = :status', { status });
    if (userId) qb.andWhere('tx.userId = :userId', { userId });
    if (dateFrom) qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('tx.createdAt <= :dateTo', { dateTo });
    if (amountMin != null)
      qb.andWhere('tx.totalAmount >= :amountMin', { amountMin });
    if (amountMax != null)
      qb.andWhere('tx.totalAmount <= :amountMax', { amountMax });

    const total = await qb.getCount();
    const rows = await qb
      .orderBy(sort, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const items = rows.entities.map((tx, idx) => {
      const raw = rows.raw[idx] as Record<string, unknown>;
      return {
        id: tx.id,
        userId: tx.userId,
        userName: (raw['user_name'] as string) ?? null,
        userPhone: (raw['user_phoneNumber'] as string) ?? null,
        type: tx.type,
        merchantName: tx.merchantName,
        merchantCategory: tx.merchantCategory,
        totalAmount: tx.totalAmount,
        totalFee: tx.totalFee,
        totalSaving: tx.totalSaving,
        status: tx.status,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      };
    });

    return paginated(items, page, limit, total);
  }

  async detail(id: string) {
    const tx = await this.txRepo.findOne({
      where: { id },
      relations: ['splits'],
    });
    if (!tx) throw new NotFoundException('Transaction not found');

    const user = await this.userRepo.findOne({ where: { id: tx.userId } });

    return {
      id: tx.id,
      userId: tx.userId,
      user: user
        ? { id: user.id, name: user.name, phoneNumber: user.phoneNumber }
        : null,
      type: tx.type,
      merchantName: tx.merchantName,
      merchantCategory: tx.merchantCategory,
      totalAmount: tx.totalAmount,
      totalFee: tx.totalFee,
      totalSaving: tx.totalSaving,
      pointsEarned: tx.pointsEarned,
      status: tx.status,
      idempotencyKey: tx.idempotencyKey,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
      splits: (tx.splits ?? []).map((s) => ({
        id: s.id,
        walletId: s.walletId,
        provider: s.provider,
        amount: s.amount,
        fee: s.fee,
        promoSaving: s.promoSaving,
        status: s.status,
        processedAt: s.processedAt,
      })),
    };
  }
}
