import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InstallmentPlanStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * En cada fecha de corte (UTC, día del mes de la tarjeta), avanza `currentInstallment`
 * y marca planes como PAID al completar el plazo.
 *
 * Opcional: desactivar con variable de entorno si no quieres cron en un entorno dado.
 */
@Injectable()
export class InstallmentPlansClosingCronService {
  private readonly logger = new Logger(InstallmentPlansClosingCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async advanceInstallmentsOnClosingDays(): Promise<void> {
    if (process.env.ENABLE_INSTALLMENT_CLOSING_CRON === 'false') {
      return;
    }

    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const utcDay = now.getUTCDate();

    const cards = await this.prisma.creditCard.findMany({
      select: { id: true, accountId: true, closingDay: true },
    });

    for (const cc of cards) {
      const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const effectiveClosing = Math.min(cc.closingDay, dim);
      if (effectiveClosing !== utcDay) {
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          const plans = await tx.installmentPlan.findMany({
            where: { accountId: cc.accountId, status: InstallmentPlanStatus.ACTIVE },
          });

          for (const p of plans) {
            const next = p.currentInstallment + 1;
            if (next > p.totalInstallments) {
              await tx.installmentPlan.update({
                where: { id: p.id },
                data: {
                  status: InstallmentPlanStatus.PAID,
                  currentInstallment: p.totalInstallments,
                },
              });
            } else {
              await tx.installmentPlan.update({
                where: { id: p.id },
                data: { currentInstallment: next },
              });
            }
          }
        });
      } catch (e) {
        this.logger.warn(
          `No se pudo avanzar MSI para tarjeta ${cc.accountId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }
}
