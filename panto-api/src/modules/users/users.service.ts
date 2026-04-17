import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { Transaction } from '../transactions/entities/transaction.entity';
import { PantoPointsLog } from '../points/entities/panto-points-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(PantoPointsLog)
    private readonly pointsLogRepo: Repository<PantoPointsLog>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phoneNumber: phone } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.userRepo.update(id, dto);
    return this.findById(id);
  }

  async getStats(userId: string) {
    const transactionCount = await this.transactionRepo.count({
      where: { userId, status: 'success' },
    });

    const savingsResult = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.totalSaving), 0)', 'totalSavings')
      .where('t.userId = :userId', { userId })
      .andWhere('t.status = :status', { status: 'success' })
      .getRawOne();

    const pointsResult = await this.pointsLogRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'totalPoints')
      .where('p.userId = :userId', { userId })
      .getRawOne();

    return {
      totalTransactions: transactionCount,
      totalSavings: Number(savingsResult?.totalSavings || 0),
      pointsBalance: Number(pointsResult?.totalPoints || 0),
    };
  }
}
