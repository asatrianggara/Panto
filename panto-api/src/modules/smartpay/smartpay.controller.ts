import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SmartpayService } from './smartpay.service';
import { CalculateSplitDto } from './dto/calculate-split.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/smartpay')
@UseGuards(JwtAuthGuard)
export class SmartpayController {
  constructor(private readonly smartpayService: SmartpayService) {}

  @Post('calculate')
  async calculate(
    @CurrentUser() user: User,
    @Body() dto: CalculateSplitDto,
  ): Promise<ApiResponse> {
    const result = await this.smartpayService.calculateSplit(user.id, dto);
    return { success: true, data: result };
  }

  @Post('validate')
  async validate(
    @CurrentUser() user: User,
    @Body() body: { splits: { walletId: string; amount: number }[]; totalAmount: number },
  ): Promise<ApiResponse> {
    const result = await this.smartpayService.validateSplits(
      user.id,
      body.splits,
      body.totalAmount,
    );
    return { success: true, data: result };
  }
}
