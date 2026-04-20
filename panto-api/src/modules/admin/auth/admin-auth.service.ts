import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/admin-user.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminJwtPayload } from './strategies/admin-jwt.strategy';

@Injectable()
export class AdminAuthService implements OnModuleInit {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const existing = await this.adminRepo.findOne({
      where: { email: 'admin@panto.id' },
    });
    if (existing) return;

    const passwordHash = await bcrypt.hash('panto123', 10);
    await this.adminRepo.save(
      this.adminRepo.create({
        email: 'admin@panto.id',
        passwordHash,
        role: 'super_admin',
        isActive: true,
      }),
    );
    this.logger.log('Seeded super admin: admin@panto.id / panto123');
  }

  async login(dto: AdminLoginDto) {
    const admin = await this.adminRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!admin.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    };
    const token = this.jwtService.sign(payload);
    return {
      token,
      admin: this.toPublic(admin),
    };
  }

  toPublic(admin: AdminUser) {
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
    };
  }
}
