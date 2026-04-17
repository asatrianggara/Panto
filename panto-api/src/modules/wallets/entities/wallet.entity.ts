import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('wallets')
@Unique(['userId', 'provider'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  provider: 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja';

  @Column()
  providerPhone: string;

  @Column({ type: 'integer', default: 0 })
  balance: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  inRouting: boolean;

  @Column({ type: 'integer', default: 0 })
  transferFee: number;

  @Column({ type: 'datetime', nullable: true })
  lastSynced: Date;

  @Column({ nullable: true })
  providerAccessToken: string;

  @Column({ nullable: true })
  providerTokenId: string;

  @Column({ default: false })
  isRealLinked: boolean;

  @CreateDateColumn()
  linkedAt: Date;

  @ManyToOne(() => User, (user) => user.wallets)
  @JoinColumn({ name: 'userId' })
  user: User;
}
