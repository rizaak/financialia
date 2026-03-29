import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Auth0JwtPayload } from './auth0-jwt-payload';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
    private readonly categoriesService: CategoriesService,
    private readonly accountsService: AccountsService,
  ) {
    const issuerRaw = config.getOrThrow<string>('AUTH0_ISSUER_URL').trim();
    const issuerBase = issuerRaw.replace(/\/+$/, '');
    const issuer = `${issuerBase}/`;
    const audience = config.getOrThrow<string>('AUTH0_AUDIENCE').trim();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience,
      issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${issuerBase}/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: Auth0JwtPayload): Promise<User> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token sin subject (sub)');
    }
    const user = await this.usersService.upsertByAuth0Subject(payload.sub, {
      email: payload.email,
      displayName: payload.name ?? payload.nickname,
      avatarUrl: payload.picture,
    });
    await this.categoriesService.ensureDefaultsForUser(user.id);
    await this.accountsService.ensurePrimaryAccount(user.id, user.defaultCurrency);
    return user;
  }
}
