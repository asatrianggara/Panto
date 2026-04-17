import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionSplit } from '../transactions/entities/transaction-split.entity';
import { PantoPointsLog } from '../points/entities/panto-points-log.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Wallet,
      Transaction,
      TransactionSplit,
      PantoPointsLog,
      Merchant,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
