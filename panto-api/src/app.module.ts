import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { SmartpayModule } from './modules/smartpay/smartpay.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { PointsModule } from './modules/points/points.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { DanaModule } from './modules/dana/dana.module';
import { GoPayModule } from './modules/gopay/gopay.module';
import { SeedModule } from './modules/seed/seed.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USER', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'panto'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        charset: 'utf8mb4',
      }),
    }),
    AuthModule,
    UsersModule,
    WalletsModule,
    SmartpayModule,
    TransactionsModule,
    PointsModule,
    MerchantsModule,
    DanaModule,
    GoPayModule,
    SeedModule,
    AdminModule,
  ],
})
export class AppModule {}
