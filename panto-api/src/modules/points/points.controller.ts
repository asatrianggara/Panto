import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get()
  async getBalance(@CurrentUser() user: User): Promise<ApiResponse> {
    const data = await this.pointsService.getBalance(user.id);
    return { success: true, data };
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<any> {
    const result = await this.pointsService.getHistory(user.id, page, limit);
    return {
      success: true,
      data: result.logs,
      meta: result.meta,
    };
  }
}
