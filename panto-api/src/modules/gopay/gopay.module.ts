import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '../wallets/entities/wallet.entity';
import { GoPayService } from './gopay.service';
import { GoPayController } from './gopay.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  controllers: [GoPayController],
  providers: [GoPayService],
  exports: [GoPayService],
})
export class GoPayModule {}
