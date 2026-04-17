import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('panto_points_log')
export class PantoPointsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  transactionId: string;

  @Column()
  type: 'earn' | 'redeem' | 'bonus';

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'integer' })
  balanceAfter: number;

  @Column()
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
