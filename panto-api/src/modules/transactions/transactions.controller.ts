import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateTransactionDto,
  ): Promise<ApiResponse> {
    const tx = await this.transactionsService.create(user.id, dto);
    return { success: true, data: tx, message: 'Payment processed successfully' };
  }

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<any> {
    const result = await this.transactionsService.findByUser(user.id, page, limit);
    return {
      success: true,
      data: result.transactions,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse> {
    const tx = await this.transactionsService.findById(user.id, id);
    return { success: true, data: tx };
  }
}
