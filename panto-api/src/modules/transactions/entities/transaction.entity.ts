import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { TransactionSplit } from './transaction-split.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'qr_payment' })
  type: string;

  @Column({ nullable: true })
  merchantName: string;

  @Column({ nullable: true })
  merchantCategory: string;

  @Column({ type: 'int' })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  totalFee: number;

  @Column({ type: 'int', default: 0 })
  totalSaving: number;

  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'processing' | 'success' | 'failed';

  @Column({ unique: true })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @OneToMany(() => TransactionSplit, (split) => split.transaction)
  splits: TransactionSplit[];
}
