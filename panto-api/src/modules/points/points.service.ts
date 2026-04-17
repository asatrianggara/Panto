import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PantoPointsLog } from './entities/panto-points-log.entity';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PantoPointsLog)
    private readonly pointsLogRepo: Repository<PantoPointsLog>,
  ) {}

  async getBalance(userId: string) {
    const result = await this.pointsLogRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'balance')
      .where('p.userId = :userId', { userId })
      .getRawOne();

    const balance = Number(result?.balance || 0);

    const earnResult = await this.pointsLogRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.userId = :userId', { userId })
      .andWhere('p.amount > 0')
      .getRawOne();

    const redeemResult = await this.pointsLogRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(ABS(p.amount)), 0)', 'total')
      .where('p.userId = :userId', { userId })
      .andWhere('p.amount < 0')
      .getRawOne();

    return {
      balance,
      totalEarned: Number(earnResult?.total || 0),
      totalRedeemed: Number(redeemResult?.total || 0),
    };
  }

  async creditPoints(
    userId: string,
    transactionId: string,
    amount: number,
    description: string,
  ): Promise<PantoPointsLog> {
    const currentBalance = await this.getBalance(userId);

    const log = this.pointsLogRepo.create({
      userId,
      transactionId,
      type: 'earn',
      amount,
      balanceAfter: currentBalance.balance + amount,
      description,
    });

    return this.pointsLogRepo.save(log);
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const [logs, total] = await this.pointsLogRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
