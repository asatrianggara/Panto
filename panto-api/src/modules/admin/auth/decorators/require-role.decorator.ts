import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../entities/admin-user.entity';

export const REQUIRE_ROLE_KEY = 'require_role';

export const RequireRole = (...roles: AdminRole[]) =>
  SetMetadata(REQUIRE_ROLE_KEY, roles);
