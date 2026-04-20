import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminUsersService } from './admin-users.service';
import { ListUsersQueryDto } from './admin-users.dto';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';

@Controller('api/admin/users')
@UseGuards(AdminJwtGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<ApiResponse> {
    const data = await this.service.list(query);
    return { success: true, data };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.service.detail(id);
    return { success: true, data };
  }

  @Get(':id/wallets')
  async wallets(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.service.wallets(id);
    return { success: true, data };
  }

  @Get(':id/transactions')
  async transactions(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.service.transactions(id);
    return { success: true, data };
  }

  @Get(':id/activity')
  async activity(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.service.activity(id);
    return { success: true, data };
  }
}
