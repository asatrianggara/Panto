import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionSplit } from '../transactions/entities/transaction-split.entity';
import { PantoPointsLog } from '../points/entities/panto-points-log.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionSplit)
    private readonly splitRepo: Repository<TransactionSplit>,
    @InjectRepository(PantoPointsLog)
    private readonly pointsLogRepo: Repository<PantoPointsLog>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async onModuleInit() {
    await this.seedMerchants();

    const existing = await this.userRepo.findOne({
      where: { phoneNumber: '08123456789' },
    });

    if (existing) {
      this.logger.log('Demo user already exists, skipping seed');
      return;
    }

    this.logger.log('Seeding demo data...');

    // Create demo user
    const pinHash = await bcrypt.hash('123456', 10);
    const user = this.userRepo.create({
      phoneNumber: '08123456789',
      name: 'Demo User',
      pinHash,
      tier: 'free',
      isActive: true,
    });
    const savedUser = await this.userRepo.save(user);

    // Create wallets
    const gopay = await this.walletRepo.save(
      this.walletRepo.create({
        userId: savedUser.id,
        provider: 'gopay',
        providerPhone: '08123456789',
        balance: 150000,
        isActive: true,
        inRouting: true,
        lastSynced: new Date(),
      }),
    );

    const ovo = await this.walletRepo.save(
      this.walletRepo.create({
        userId: savedUser.id,
        provider: 'ovo',
        providerPhone: '08123456789',
        balance: 120000,
        isActive: true,
        inRouting: true,
        lastSynced: new Date(),
      }),
    );

    const dana = await this.walletRepo.save(
      this.walletRepo.create({
        userId: savedUser.id,
        provider: 'dana',
        providerPhone: '08123456789',
        balance: 80000,
        isActive: true,
        inRouting: true,
        lastSynced: new Date(),
      }),
    );

    // Create welcome bonus points
    await this.pointsLogRepo.save(
      this.pointsLogRepo.create({
        userId: savedUser.id,
        transactionId: null,
        type: 'bonus',
        amount: 1089,
        balanceAfter: 1089,
        description: 'Welcome bonus',
      }),
    );

    // Create sample transaction 1
    const tx1 = await this.txRepo.save(
      this.txRepo.create({
        userId: savedUser.id,
        type: 'qr_payment',
        merchantName: 'Kopi Kenangan',
        merchantCategory: 'food',
        totalAmount: 45000,
        totalFee: 0,
        totalSaving: 2500,
        pointsEarned: 45,
        status: 'success',
        idempotencyKey: crypto.randomUUID(),
        completedAt: new Date(),
      }),
    );

    await this.splitRepo.save(
      this.splitRepo.create({
        transactionId: tx1.id,
        walletId: gopay.id,
        provider: 'gopay',
        amount: 30000,
        fee: 0,
        promoSaving: 0,
        status: 'success',
        processedAt: new Date(),
      }),
    );

    await this.splitRepo.save(
      this.splitRepo.create({
        transactionId: tx1.id,
        walletId: ovo.id,
        provider: 'ovo',
        amount: 15000,
        fee: 0,
        promoSaving: 0,
        status: 'success',
        processedAt: new Date(),
      }),
    );

    // Create sample transaction 2
    const tx2 = await this.txRepo.save(
      this.txRepo.create({
        userId: savedUser.id,
        type: 'qr_payment',
        merchantName: 'Indomaret',
        merchantCategory: 'shopping',
        totalAmount: 78000,
        totalFee: 0,
        totalSaving: 2500,
        pointsEarned: 78,
        status: 'success',
        idempotencyKey: crypto.randomUUID(),
        completedAt: new Date(),
      }),
    );

    await this.splitRepo.save(
      this.splitRepo.create({
        transactionId: tx2.id,
        walletId: dana.id,
        provider: 'dana',
        amount: 50000,
        fee: 0,
        promoSaving: 0,
        status: 'success',
        processedAt: new Date(),
      }),
    );

    await this.splitRepo.save(
      this.splitRepo.create({
        transactionId: tx2.id,
        walletId: gopay.id,
        provider: 'gopay',
        amount: 28000,
        fee: 0,
        promoSaving: 0,
        status: 'success',
        processedAt: new Date(),
      }),
    );

    // Points for transactions
    await this.pointsLogRepo.save(
      this.pointsLogRepo.create({
        userId: savedUser.id,
        transactionId: tx1.id,
        type: 'earn',
        amount: 45,
        balanceAfter: 1134,
        description: 'Payment to Kopi Kenangan',
      }),
    );

    await this.pointsLogRepo.save(
      this.pointsLogRepo.create({
        userId: savedUser.id,
        transactionId: tx2.id,
        type: 'earn',
        amount: 78,
        balanceAfter: 1212,
        description: 'Payment to Indomaret',
      }),
    );

    this.logger.log('Demo data seeded successfully');
  }

  private async seedMerchants() {
    const count = await this.merchantRepo.count();
    if (count > 0) return;

    const merchants = [
      { name: 'Kopi Kenangan', category: 'food', defaultBill: 35000, logoEmoji: '☕' },
      { name: 'Indomaret', category: 'shopping', defaultBill: 50000, logoEmoji: '🏪' },
      { name: 'GrabFood', category: 'food', defaultBill: 75000, logoEmoji: '🍔' },
      { name: 'Apotek Kimia Farma', category: 'health', defaultBill: 120000, logoEmoji: '💊' },
      { name: 'SPBU Pertamina', category: 'transport', defaultBill: 100000, logoEmoji: '⛽' },
    ];

    for (const m of merchants) {
      await this.merchantRepo.save(this.merchantRepo.create(m));
    }
    this.logger.log('Seeded 5 demo merchants');
  }
}
