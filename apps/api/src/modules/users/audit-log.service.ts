import { Injectable } from '@nestjs/common';
import { AuditService } from '@common/audit.service';

export type MoneyMovementAuditContext = {
  userId: string;
  auth0Sub?: string | null;
  /** Identificador corto, ej. transaction.create, transfer.create */
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

/**
 * Fachada de dominio sobre auditoría: movimientos de dinero con action, IP, user-agent y timestamp (DB).
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly audit: AuditService) {}

  async recordMoneyMovement(ctx: MoneyMovementAuditContext): Promise<void> {
    await this.audit.logSensitiveAction({
      userId: ctx.userId,
      auth0Sub: ctx.auth0Sub,
      action: `MONEY:${ctx.action}`,
      resource: ctx.resource,
      metadata: {
        kind: 'money_movement',
        ...ctx.metadata,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}
