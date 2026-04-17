import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Transaction } from './entities/transaction.entity';
import { TransactionSplit } from './entities/transaction-split.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { PointsService } from '../points/points.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { getManualConsolidationCost } from '../smartpay/wallet-fees.constant';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionSplit)
    private readonly splitRepo: Repository<TransactionSplit>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly pointsService: PointsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const splitSum = dto.splits.reduce((sum, s) => sum + s.amount, 0);
    if (splitSum !== dto.totalAmount) {
      throw new BadRequestException(
        `Splits sum (${splitSum}) does not match total amount (${dto.totalAmount})`,
      );
    }

    const providers: string[] = [];
    for (const split of dto.splits) {
      const wallet = await this.walletRepo.findOne({
        where: { id: split.walletId, userId },
      });
      if (!wallet) {
        throw new BadRequestException(`Wallet ${split.walletId} not found`);
      }
      if (wallet.balance < split.amount) {
        throw new BadRequestException(
          `Insufficient balance in ${wallet.provider}: ${wallet.balance} < ${split.amount}`,
        );
      }
      providers.push(wallet.provider);
    }

    const idempotencyKey = dto.idempotencyKey || crypto.randomUUID();

    const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      return existing;
    }

    const transaction = this.txRepo.create({
      userId,
      type: 'qr_payment',
      merchantName: dto.merchantName,
      merchantCategory: dto.merchantCategory,
      totalAmount: dto.totalAmount,
      totalFee: 0,
      totalSaving: getManualConsolidationCost(providers),
      status: 'processing',
      idempotencyKey,
    });

    const savedTx = await this.txRepo.save(transaction);

    const splitEntities: TransactionSplit[] = [];
    for (const split of dto.splits) {
      const wallet = await this.walletRepo.findOne({
        where: { id: split.walletId },
      });

      const splitEntity = this.splitRepo.create({
        transactionId: savedTx.id,
        walletId: split.walletId,
        provider: wallet.provider,
        amount: split.amount,
        fee: wallet.transferFee,
        status: 'pending',
      });
      splitEntities.push(await this.splitRepo.save(splitEntity));
    }

    // Simulated 2-second processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Deduct balances and mark splits as success
    for (const split of dto.splits) {
      await this.walletRepo
        .createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `balance - ${split.amount}` })
        .where('id = :id', { id: split.walletId })
        .execute();
    }

    await this.splitRepo
      .createQueryBuilder()
      .update(TransactionSplit)
      .set({ status: 'success', processedAt: new Date() })
      .where('transactionId = :txId', { txId: savedTx.id })
      .execute();

    const totalFee = splitEntities.reduce((sum, s) => sum + s.fee, 0);
    const pointsEarned = Math.floor(dto.totalAmount / 1000);

    savedTx.status = 'success';
    savedTx.totalFee = totalFee;
    savedTx.pointsEarned = pointsEarned;
    savedTx.completedAt = new Date();
    await this.txRepo.save(savedTx);

    if (pointsEarned > 0) {
      await this.pointsService.creditPoints(
        userId,
        savedTx.id,
        pointsEarned,
        `Payment to ${dto.merchantName}`,
      );
    }

    return this.txRepo.findOne({
      where: { id: savedTx.id },
      relations: ['splits'],
    });
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const [transactions, total] = await this.txRepo.findAndCount({
      where: { userId },
      relations: ['splits'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(userId: string, id: string) {
    const tx = await this.txRepo.findOne({
      where: { id, userId },
      relations: ['splits'],
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    return tx;
  }
}
