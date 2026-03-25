import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (prop: keyof User | undefined, ctx: ExecutionContext): User | User[keyof User] | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return prop ? user[prop] : user;
  },
);
