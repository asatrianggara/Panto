import { Module } from '@nestjs/common';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminUsersModule } from './users/admin-users.module';
import { AdminWalletsModule } from './wallets/admin-wallets.module';
import { AdminTransactionsModule } from './transactions/admin-transactions.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminUsersModule,
    AdminWalletsModule,
    AdminTransactionsModule,
    AdminDashboardModule,
  ],
})
export class AdminModule {}
