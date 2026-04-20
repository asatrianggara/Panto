import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { TransactionSplit } from '../../transactions/entities/transaction-split.entity';
import { User } from '../../users/entities/user.entity';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminAuthModule } from '../auth/admin-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionSplit, User]),
    AdminAuthModule,
  ],
  controllers: [AdminTransactionsController],
  providers: [AdminTransactionsService],
})
export class AdminTransactionsModule {}
