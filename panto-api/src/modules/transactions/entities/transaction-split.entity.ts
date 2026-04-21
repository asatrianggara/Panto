import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('transaction_splits')
export class TransactionSplit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  transactionId: string;

  @Column()
  walletId: string;

  @Column()
  provider: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'int', default: 0 })
  fee: number;

  @Column({ type: 'int', default: 0 })
  promoSaving: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'success' | 'failed';

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date;

  @ManyToOne(() => Transaction, (transaction) => transaction.splits)
  @JoinColumn({ name: 'transactionId' })
  transaction: Transaction;
}
