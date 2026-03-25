import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Cliente de transacción Prisma con delegados de modelo (para $transaction). */
export type PrismaTx = Pick<
  PrismaService,
  'account' | 'user' | 'transaction' | 'tieredInvestment' | 'investmentTransaction' | 'category'
>;

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Garantiza al menos una cuenta por usuario (nuevos registros).
   */
  async ensurePrimaryAccount(userId: string, currency = 'USD'): Promise<void> {
    const n = await this.prisma.account.count({ where: { userId } });
    if (n > 0) {
      return;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const cur = (user?.defaultCurrency ?? currency).toUpperCase().slice(0, 3);
    await this.prisma.account.create({
      data: {
        userId,
        name: 'Cuenta principal',
        type: AccountType.CASH,
        currency: cur,
        balance: new Prisma.Decimal(0),
      },
    });
  }

  async listAccounts(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Desglose por tipo (solo cuentas en la moneda preferida del usuario) + total invertido en tramos.
   */
  async getSummary(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const cur = user.defaultCurrency.toUpperCase().slice(0, 3);

    const accounts = await this.prisma.account.findMany({
      where: { userId, currency: cur },
    });

    let totalBanks = new Prisma.Decimal(0);
    let totalWallets = new Prisma.Decimal(0);
    let totalCash = new Prisma.Decimal(0);

    for (const a of accounts) {
      const b = new Prisma.Decimal(a.balance);
      if (a.type === AccountType.BANK) {
        totalBanks = totalBanks.plus(b);
      } else if (a.type === AccountType.WALLET) {
        totalWallets = totalWallets.plus(b);
      } else {
        totalCash = totalCash.plus(b);
      }
    }

    const totalLiquid = totalBanks.plus(totalWallets).plus(totalCash);

    const invAgg = await this.prisma.tieredInvestment.aggregate({
      where: { userId, currency: cur },
      _sum: { principal: true },
    });
    const totalInvestedTiered = invAgg._sum.principal ?? new Prisma.Decimal(0);

    const totalNetBalance = totalLiquid.plus(totalInvestedTiered);

    return {
      defaultCurrency: cur,
      totalBanks: totalBanks.toString(),
      totalWallets: totalWallets.toString(),
      totalCash: totalCash.toString(),
      totalLiquid: totalLiquid.toString(),
      totalInvestedTiered: totalInvestedTiered.toString(),
      totalNetBalance: totalNetBalance.toString(),
      accounts,
    };
  }

  async createAccount(userId: string, dto: { name: string; type: AccountType; currency?: string }) {
    const cur = (dto.currency ?? 'USD').toUpperCase().slice(0, 3);
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name.trim(),
        type: dto.type,
        currency: cur,
        balance: new Prisma.Decimal(0),
      },
    });
  }

  async transfer(userId: string, fromAccountId: string, toAccountId: string, amount: number) {
    if (fromAccountId === toAccountId) {
      throw new BadRequestException('Las cuentas origen y destino deben ser distintas.');
    }
    const dec = new Prisma.Decimal(amount);
    await this.prisma.$transaction(async (tx) => {
      const from = await tx.account.findFirst({
        where: { id: fromAccountId, userId },
      });
      const to = await tx.account.findFirst({
        where: { id: toAccountId, userId },
      });
      if (!from || !to) {
        throw new NotFoundException('Cuenta no encontrada');
      }
      if (from.currency !== to.currency) {
        throw new BadRequestException('Solo transferencias en la misma moneda.');
      }
      const debited = await tx.account.updateMany({
        where: { id: fromAccountId, userId, balance: { gte: dec } },
        data: { balance: { decrement: dec } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('Saldo insuficiente en la cuenta origen.');
      }
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: dec } },
      });
    });
  }

  async assertAccountForUser(accountId: string, userId: string) {
    const a = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!a) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    return a;
  }

  async debitInTx(
    tx: PrismaTx,
    accountId: string,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    const r = await tx.account.updateMany({
      where: { id: accountId, userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (r.count === 0) {
      throw new BadRequestException('Saldo insuficiente en la cuenta seleccionada.');
    }
  }

  async creditInTx(
    tx: PrismaTx,
    accountId: string,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    const r = await tx.account.updateMany({
      where: { id: accountId, userId },
      data: { balance: { increment: amount } },
    });
    if (r.count === 0) {
      throw new BadRequestException('Cuenta destino no válida.');
    }
  }
}
