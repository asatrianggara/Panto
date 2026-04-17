import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DanaService } from './dana.service';
import { DanaController } from './dana.controller';
import { Wallet } from '../wallets/entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  controllers: [DanaController],
  providers: [DanaService],
  exports: [DanaService],
})
export class DanaModule {}
