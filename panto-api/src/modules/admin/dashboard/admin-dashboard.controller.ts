import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';

@Controller('api/admin/dashboard')
@UseGuards(AdminJwtGuard)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('overview')
  async overview(): Promise<ApiResponse> {
    const data = await this.service.overview();
    return { success: true, data };
  }
}
