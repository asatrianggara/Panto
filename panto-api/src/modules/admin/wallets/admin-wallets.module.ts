import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { AdminWalletsController } from './admin-wallets.controller';
import { AdminWalletsService } from './admin-wallets.service';
import { AdminAuthModule } from '../auth/admin-auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet]), AdminAuthModule],
  controllers: [AdminWalletsController],
  providers: [AdminWalletsService],
})
export class AdminWalletsModule {}
