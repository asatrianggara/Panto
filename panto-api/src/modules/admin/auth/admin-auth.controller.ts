import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminUser } from './entities/admin-user.entity';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';

@Controller('api/admin/auth')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto): Promise<ApiResponse> {
    const data = await this.service.login(dto);
    return { success: true, data, message: 'Login successful' };
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  me(@CurrentAdmin() admin: AdminUser): ApiResponse {
    return { success: true, data: this.service.toPublic(admin) };
  }
}
