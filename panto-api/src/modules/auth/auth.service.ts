import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const pinHash = await bcrypt.hash(dto.pin, 10);
    const user = await this.usersService.create({
      phoneNumber: dto.phone,
      name: dto.name,
      pinHash,
    });

    const token = this.generateToken(user.id, user.phoneNumber);

    return {
      accessToken: token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        tier: user.tier,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    const pinValid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!pinValid) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const token = this.generateToken(user.id, user.phoneNumber);

    return {
      accessToken: token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        tier: user.tier,
      },
    };
  }

  generateToken(userId: string, phone: string): string {
    return this.jwtService.sign({ userId, phone });
  }
}
