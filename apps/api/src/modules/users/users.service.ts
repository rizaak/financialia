import { Injectable } from '@nestjs/common';
import { Prisma, type RiskTolerance, type User } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

export type UpsertUserByAuth0Input = {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type UserProfileResponse = {
  auth0Subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  defaultCurrency: string;
  baseCurrency: string;
  monthlyBudget: string | null;
  riskTolerance: RiskTolerance;
  language: string;
  timezone: string;
  hideBalances: boolean;
  profileUpdatedAt: string;
  userUpdatedAt: string;
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
    const user = await this.prisma.user.upsert({
      where: { auth0Subject },
      create: {
        auth0Subject,
        email: profile?.email ?? undefined,
        displayName: profile?.displayName ?? undefined,
        avatarUrl: profile?.avatarUrl ?? undefined,
      },
      update:
        Object.keys(update).length > 0 ? update : { auth0Subject },
    });
    await this.ensureProfile(user.id);
    return user;
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
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: patch,
    });
    await this.ensureProfile(userId);
    if (patch.defaultCurrency) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: { baseCurrency: user.defaultCurrency },
      });
    }
    return user;
  }

  /** Garantiza fila `UserProfile` alineada con `User`. */
  async ensureProfile(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return;
    }
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        baseCurrency: user.defaultCurrency,
        timezone: user.timezone,
      },
      update: {},
    });
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    await this.ensureProfile(userId);
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    });
    const p = row.profile;
    if (!p) {
      throw new Error('UserProfile missing');
    }
    return this.toProfileResponse(row, p);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponse> {
    await this.ensureProfile(userId);

    const userPatch: {
      defaultCurrency?: string;
      timezone?: string;
      displayName?: string | null;
      avatarUrl?: string | null;
    } = {};
    const profilePatch: Prisma.UserProfileUpdateInput = {};

    if (dto.baseCurrency !== undefined) {
      const cur = dto.baseCurrency.trim().toUpperCase().slice(0, 3);
      profilePatch.baseCurrency = cur;
      userPatch.defaultCurrency = cur;
    }
    if (dto.monthlyBudget !== undefined) {
      profilePatch.monthlyBudget = new Prisma.Decimal(dto.monthlyBudget);
    }
    if (dto.riskTolerance !== undefined) {
      profilePatch.riskTolerance = dto.riskTolerance;
    }
    if (dto.language !== undefined) {
      profilePatch.language = dto.language.trim();
    }
    if (dto.timezone !== undefined) {
      const tz = dto.timezone.trim();
      profilePatch.timezone = tz;
      userPatch.timezone = tz;
    }
    if (dto.hideBalances !== undefined) {
      profilePatch.hideBalances = dto.hideBalances;
    }
    if (dto.avatarUrl !== undefined) {
      userPatch.avatarUrl = dto.avatarUrl.trim() === '' ? null : dto.avatarUrl.trim();
    }
    if (dto.displayName !== undefined) {
      userPatch.displayName = dto.displayName.trim() === '' ? null : dto.displayName.trim();
    }

    if (Object.keys(userPatch).length === 0 && Object.keys(profilePatch).length === 0) {
      return this.getProfile(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userPatch).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userPatch,
        });
      }
      if (Object.keys(profilePatch).length > 0) {
        await tx.userProfile.update({
          where: { userId },
          data: profilePatch,
        });
      }
    });

    return this.getProfile(userId);
  }

  private toProfileResponse(
    user: User,
    p: {
      baseCurrency: string;
      monthlyBudget: Prisma.Decimal | null;
      riskTolerance: RiskTolerance;
      language: string;
      timezone: string;
      hideBalances: boolean;
      updatedAt: Date;
    },
  ): UserProfileResponse {
    return {
      auth0Subject: user.auth0Subject,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      defaultCurrency: user.defaultCurrency,
      baseCurrency: p.baseCurrency,
      monthlyBudget: p.monthlyBudget === null ? null : p.monthlyBudget.toString(),
      riskTolerance: p.riskTolerance,
      language: p.language,
      timezone: p.timezone,
      hideBalances: p.hideBalances,
      profileUpdatedAt: p.updatedAt.toISOString(),
      userUpdatedAt: user.updatedAt.toISOString(),
    };
  }
}
