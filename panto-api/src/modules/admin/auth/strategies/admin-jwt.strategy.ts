import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities/admin-user.entity';
import { ADMIN_JWT_SECRET } from '../admin-auth.constants';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: AdminUser['role'];
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ADMIN_JWT_SECRET,
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminUser> {
    const admin = await this.adminRepo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Admin not found or inactive');
    }
    return admin;
  }
}
