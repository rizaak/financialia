import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionSource, TransactionType, type Transaction } from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId, isArchived: false },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (category.kind !== dto.type) {
      throw new BadRequestException(
        'La categoría no corresponde al tipo de movimiento (usa una categoría de gasto o de ingreso según corresponda).',
      );
    }

    const account = await this.accounts.assertAccountForUser(dto.accountId, userId);
    const currency = (dto.currency ?? account.currency).toUpperCase().slice(0, 3);
    if (account.currency !== currency) {
      throw new BadRequestException('La moneda del movimiento debe coincidir con la de la cuenta.');
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const amountDec = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      if (dto.type === TransactionType.EXPENSE) {
        await this.accounts.debitInTx(tx, dto.accountId, userId, amountDec);
      } else {
        await this.accounts.creditInTx(tx, dto.accountId, userId, amountDec);
      }
      return tx.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: amountDec,
          currency,
          concept: dto.concept,
          notes: dto.notes,
          occurredAt,
          source: dto.source ?? TransactionSource.MANUAL,
        },
      });
    });
  }

  async list(userId: string, query: ListTransactionsQueryDto): Promise<Transaction[]> {
    const limit = query.limit ?? 50;
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) {
        where.occurredAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.occurredAt.lte = new Date(query.to);
      }
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }
}
