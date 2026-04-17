import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<ApiResponse> {
    const data = await this.authService.register(dto);
    return { success: true, data, message: 'Registration successful' };
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<ApiResponse> {
    const data = await this.authService.login(dto);
    return { success: true, data, message: 'Login successful' };
  }
}
