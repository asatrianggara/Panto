import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { SmartpayModule } from './modules/smartpay/smartpay.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { PointsModule } from './modules/points/points.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { DanaModule } from './modules/dana/dana.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: './panto.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    WalletsModule,
    SmartpayModule,
    TransactionsModule,
    PointsModule,
    MerchantsModule,
    DanaModule,
    SeedModule,
  ],
})
export class AppModule {}
