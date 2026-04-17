import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartpayService } from './smartpay.service';
import { SmartpayController } from './smartpay.controller';
import { Wallet } from '../wallets/entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  controllers: [SmartpayController],
  providers: [SmartpayService],
  exports: [SmartpayService],
})
export class SmartpayModule {}
