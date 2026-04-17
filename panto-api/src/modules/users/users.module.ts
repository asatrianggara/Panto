import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { PantoPointsLog } from '../points/entities/panto-points-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, PantoPointsLog])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
