import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: User): Promise<ApiResponse> {
    const { pinHash, ...userData } = user;
    return { success: true, data: userData };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ): Promise<ApiResponse> {
    const updated = await this.usersService.update(user.id, dto);
    const { pinHash, ...userData } = updated;
    return { success: true, data: userData, message: 'Profile updated' };
  }

  @Get('me/stats')
  async getStats(@CurrentUser() user: User): Promise<ApiResponse> {
    const stats = await this.usersService.getStats(user.id);
    return { success: true, data: stats };
  }
}
