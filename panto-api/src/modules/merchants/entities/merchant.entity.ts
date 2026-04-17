import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'integer', nullable: true })
  defaultBill: number;

  @Column({ nullable: true })
  logoEmoji: string;

  @CreateDateColumn()
  createdAt: Date;
}
