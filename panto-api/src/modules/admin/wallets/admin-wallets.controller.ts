import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminWalletsService } from './admin-wallets.service';
import { ListWalletsQueryDto } from './admin-wallets.dto';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';

@Controller('api/admin/wallets')
@UseGuards(AdminJwtGuard)
export class AdminWalletsController {
  constructor(private readonly service: AdminWalletsService) {}

  @Get()
  async list(@Query() query: ListWalletsQueryDto): Promise<ApiResponse> {
    const data = await this.service.list(query);
    return { success: true, data };
  }

  @Get('summary')
  async summary(): Promise<ApiResponse> {
    const data = await this.service.summary();
    return { success: true, data };
  }
}
