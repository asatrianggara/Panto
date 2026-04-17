import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/merchants')
@UseGuards(JwtAuthGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  async list(): Promise<ApiResponse> {
    const merchants = await this.merchantsService.findAll();
    const data = merchants.map((m) => ({
      ...m,
      qrPayload: this.merchantsService.buildQrPayload(m),
    }));
    return { success: true, data };
  }

  @Get(':id/qr')
  async getQr(@Param('id') id: string): Promise<ApiResponse> {
    const merchant = await this.merchantsService.findOne(id);
    return {
      success: true,
      data: this.merchantsService.buildQrPayload(merchant),
    };
  }
}
