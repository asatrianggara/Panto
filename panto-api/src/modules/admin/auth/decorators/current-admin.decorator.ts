import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminUser } from '../entities/admin-user.entity';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AdminUser }>();
    return req.user;
  },
);
