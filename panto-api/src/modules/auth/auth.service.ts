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
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { OtpService, OtpChallenge } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Register creates the user account, then issues an OTP challenge.
   * The user must complete /auth/otp/verify to receive an accessToken.
   * (Register is OTP-gated for consistency with login; see summary.)
   */
  async register(dto: RegisterDto): Promise<OtpChallenge> {
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

    return this.otpService.issueChallenge(user.id, user.phoneNumber);
  }

  /**
   * Login verifies phone+PIN and then issues an OTP challenge. The
   * caller must POST /auth/otp/verify with a valid OTP to receive a
   * real accessToken.
   */
  async login(dto: LoginDto): Promise<OtpChallenge> {
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

    return this.otpService.issueChallenge(user.id, user.phoneNumber);
  }

  /**
   * Completes the OTP challenge and mints the real access token that
   * the existing JwtStrategy accepts.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const payload = this.otpService.verifyOtpCode(dto.otpToken, dto.otp);

    const user = await this.usersService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const accessToken = this.generateToken(user.id, user.phoneNumber);

    return {
      accessToken,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        tier: user.tier,
      },
    };
  }

  /**
   * Re-issues a fresh otpToken (and logs the mock "send") for an
   * in-flight login challenge.
   */
  async resendOtp(dto: ResendOtpDto): Promise<OtpChallenge> {
    return this.otpService.resendChallenge(dto.otpToken);
  }

  generateToken(userId: string, phone: string): string {
    return this.jwtService.sign({ userId, phone });
  }
}
