import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type UpsertUserByAuth0Input = {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea o actualiza el usuario identificado por el `sub` de Auth0.
   * Solo escribe campos de perfil cuando vienen definidos en `profile`.
   */
  async upsertByAuth0Subject(
    auth0Subject: string,
    profile?: UpsertUserByAuth0Input,
  ): Promise<User> {
    const update = this.buildProfileUpdate(profile);
    return this.prisma.user.upsert({
      where: { auth0Subject },
      create: {
        auth0Subject,
        email: profile?.email ?? undefined,
        displayName: profile?.displayName ?? undefined,
        avatarUrl: profile?.avatarUrl ?? undefined,
      },
      // Prisma no admite `update` vacío; re-asignar el mismo `sub` es un no-op válido.
      update:
        Object.keys(update).length > 0 ? update : { auth0Subject },
    });
  }

  private buildProfileUpdate(profile?: UpsertUserByAuth0Input): Record<string, string | null> {
    if (!profile) {
      return {};
    }
    const patch: Record<string, string | null> = {};
    if (profile.email !== undefined) {
      patch.email = profile.email;
    }
    if (profile.displayName !== undefined) {
      patch.displayName = profile.displayName;
    }
    if (profile.avatarUrl !== undefined) {
      patch.avatarUrl = profile.avatarUrl;
    }
    return patch;
  }

  async updateMe(userId: string, data: { defaultCurrency?: string }) {
    const patch: { defaultCurrency?: string } = {};
    if (data.defaultCurrency !== undefined) {
      patch.defaultCurrency = data.defaultCurrency.trim().toUpperCase();
    }
    if (Object.keys(patch).length === 0) {
      return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: patch,
    });
  }
}
