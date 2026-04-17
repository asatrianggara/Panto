import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { PantoPointsLog } from './entities/panto-points-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PantoPointsLog])],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
