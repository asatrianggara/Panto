import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { LinkWalletDto } from './dto/link-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  async listWallets(@CurrentUser() user: User): Promise<ApiResponse> {
    const wallets = await this.walletsService.findByUser(user.id);
    return { success: true, data: wallets };
  }

  @Post('link')
  async linkWallet(
    @CurrentUser() user: User,
    @Body() dto: LinkWalletDto,
  ): Promise<ApiResponse> {
    const wallet = await this.walletsService.linkWallet(user.id, dto);
    return { success: true, data: wallet, message: 'Wallet linked successfully' };
  }

  @Delete(':id')
  async unlinkWallet(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse> {
    await this.walletsService.unlinkWallet(user.id, id);
    return { success: true, message: 'Wallet unlinked' };
  }

  @Patch(':id')
  async updateWallet(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto,
  ): Promise<ApiResponse> {
    const wallet = await this.walletsService.updateWallet(user.id, id, dto);
    return { success: true, data: wallet, message: 'Wallet updated' };
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: User): Promise<ApiResponse> {
    const summary = await this.walletsService.getSummary(user.id);
    return { success: true, data: summary };
  }
}
