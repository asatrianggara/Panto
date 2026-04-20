import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminTransactionsService } from './admin-transactions.service';
import { ListTransactionsQueryDto } from './admin-transactions.dto';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';

@Controller('api/admin/transactions')
@UseGuards(AdminJwtGuard)
export class AdminTransactionsController {
  constructor(private readonly service: AdminTransactionsService) {}

  @Get()
  async list(
    @Query() query: ListTransactionsQueryDto,
  ): Promise<ApiResponse> {
    const data = await this.service.list(query);
    return { success: true, data };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.service.detail(id);
    return { success: true, data };
  }
}
