import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountType,
  Prisma,
  TransactionSource,
  TransactionType,
  type Transfer,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountsService } from '../../accounts/accounts.service';
import { AuditLogService } from '../../users/audit-log.service';
import type { CreateTransferDto } from './dto/create-transfer.dto';
import type { ListTransfersQueryDto } from './dto/list-transfers-query.dto';

const COMISIONES_SLUG = 'comisiones-bancarias';
const INTERESES_TC_SLUG = 'intereses-cargos-tc';

export type TransferAuditContext = {
  auth0Sub?: string | null;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(
    userId: string,
    dto: CreateTransferDto,
    audit?: TransferAuditContext,
  ): Promise<Transfer> {
    const amount = new Prisma.Decimal(dto.amount);
    const fee = new Prisma.Decimal(dto.fee ?? 0);
    const bankCharges = new Prisma.Decimal(dto.creditCardBankCharges ?? 0);
    if (amount.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor que cero.');
    }
    if (fee.lt(0)) {
      throw new BadRequestException('La comisión no puede ser negativa.');
    }
    if (bankCharges.lt(0)) {
      throw new BadRequestException('Los cargos del banco no pueden ser negativos.');
    }

    const totalOut = amount.plus(fee);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Fecha inválida.');
    }

    const transfer = await this.prisma.$transaction(async (tx) => {
      const from = await this.accounts.assertActiveAccountForUser(dto.fromAccountId, userId);
      const to = await this.accounts.assertActiveAccountForUser(dto.toAccountId, userId);
      if (from.id === to.id) {
        throw new BadRequestException('El origen y el destino deben ser distintos.');
      }
      if (from.currency !== to.currency) {
        throw new BadRequestException('Solo transferencias en la misma moneda.');
      }
      if (from.type === AccountType.CREDIT_CARD) {
        throw new BadRequestException(
          'No se puede transferir desde una tarjeta de crédito (usa un movimiento o pago explícito).',
        );
      }
      if (bankCharges.gt(0) && to.type !== AccountType.CREDIT_CARD) {
        throw new BadRequestException(
          'Los cargos del banco solo aplican cuando el destino es una tarjeta de crédito.',
        );
      }

      if (to.type === AccountType.CREDIT_CARD && bankCharges.gt(0)) {
        await tx.account.update({
          where: { id: to.id },
          data: { balance: { increment: bankCharges } },
        });
        const catId = await this.ensureInteresesTarjetaCategory(tx, userId);
        await tx.transaction.create({
          data: {
            userId,
            accountId: to.id,
            categoryId: catId,
            type: TransactionType.EXPENSE,
            amount: bankCharges,
            currency: to.currency,
            concept: 'Intereses / cargos del banco (antes del pago)',
            notes: dto.notes?.trim() || null,
            occurredAt,
            source: TransactionSource.MANUAL,
            metadata: { creditCardPaymentPreface: true },
          },
        });
      }

      const debited = await tx.account.updateMany({
        where: { id: from.id, userId, balance: { gte: totalOut } },
        data: { balance: { decrement: totalOut } },
      });
      if (debited.count === 0) {
        throw new BadRequestException(
          'Saldo insuficiente en la cuenta origen (el monto más la comisión no está disponible).',
        );
      }

      if (to.type === AccountType.CREDIT_CARD) {
        const paid = await tx.account.updateMany({
          where: { id: to.id, userId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (paid.count === 0) {
          throw new BadRequestException(
            'El pago a la tarjeta no puede ser mayor que la deuda registrada (incluye cargos del banco si los indicaste).',
          );
        }
      } else {
        await tx.account.update({
          where: { id: to.id },
          data: { balance: { increment: amount } },
        });
      }

      let feeTransactionId: string | null = null;
      if (fee.gt(0)) {
        const catId = await this.ensureComisionesCategory(tx, userId);
        const feeTx = await tx.transaction.create({
          data: {
            userId,
            accountId: from.id,
            categoryId: catId,
            type: TransactionType.EXPENSE,
            amount: fee,
            currency: from.currency,
            concept: 'Comisión por transferencia entre cuentas',
            notes: dto.notes?.trim() || null,
            occurredAt,
            source: TransactionSource.MANUAL,
          },
        });
        feeTransactionId = feeTx.id;
      }

      return tx.transfer.create({
        data: {
          userId,
          originAccountId: from.id,
          destinationAccountId: to.id,
          amount,
          fee,
          occurredAt,
          notes: dto.notes?.trim() || null,
          feeTransactionId,
        },
        include: {
          originAccount: { select: { id: true, name: true, type: true, currency: true } },
          destinationAccount: { select: { id: true, name: true, type: true, currency: true } },
        },
      });
    });

    void this.auditLog.recordMoneyMovement({
      userId,
      auth0Sub: audit?.auth0Sub,
      action: 'transfer.create',
      resource: `transfer:${transfer.id}`,
      metadata: {
        amount: transfer.amount.toString(),
        fee: transfer.fee.toString(),
        originAccountId: transfer.originAccountId,
        destinationAccountId: transfer.destinationAccountId,
      },
      ip: audit?.ip,
      userAgent: audit?.userAgent,
    });

    return transfer;
  }

  async list(userId: string, query: ListTransfersQueryDto) {
    const limit = query.limit ?? 50;
    const where: Prisma.TransferWhereInput = { userId };
    if (query.accountId) {
      where.OR = [
        { originAccountId: query.accountId },
        { destinationAccountId: query.accountId },
      ];
    }
    return this.prisma.transfer.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        originAccount: { select: { id: true, name: true, type: true, currency: true } },
        destinationAccount: { select: { id: true, name: true, type: true, currency: true } },
      },
    });
  }

  private async ensureComisionesCategory(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<string> {
    const found = await tx.category.findFirst({
      where: { userId, slug: COMISIONES_SLUG, kind: TransactionType.EXPENSE },
    });
    if (found) {
      return found.id;
    }
    const c = await tx.category.create({
      data: {
        userId,
        slug: COMISIONES_SLUG,
        name: 'Comisiones bancarias',
        kind: TransactionType.EXPENSE,
        color: '#78716c',
      },
    });
    return c.id;
  }

  private async ensureInteresesTarjetaCategory(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<string> {
    const found = await tx.category.findFirst({
      where: { userId, slug: INTERESES_TC_SLUG, kind: TransactionType.EXPENSE },
    });
    if (found) {
      return found.id;
    }
    const c = await tx.category.create({
      data: {
        userId,
        slug: INTERESES_TC_SLUG,
        name: 'Intereses / cargos TC',
        kind: TransactionType.EXPENSE,
        color: '#b45309',
      },
    });
    return c.id;
  }
}
