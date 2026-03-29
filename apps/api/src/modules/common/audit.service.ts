import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logSensitiveAction(params: {
    userId: string;
    auth0Sub?: string | null;
    action: string;
    resource?: string;
    metadata?: Prisma.InputJsonValue;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        auth0Sub: params.auth0Sub ?? null,
        action: params.action,
        resource: params.resource ?? null,
        ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }
}
