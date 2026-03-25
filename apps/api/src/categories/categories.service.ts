import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionType, type Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_EXPENSE_CATEGORY_SEEDS, DEFAULT_INCOME_CATEGORY_SEEDS } from './default-category-seeds';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Si faltan categorías de gasto o de ingreso, las crea (una sola vez por tipo y usuario).
   */
  async ensureDefaultsForUser(userId: string): Promise<void> {
    const expenseCount = await this.prisma.category.count({
      where: { userId, kind: TransactionType.EXPENSE },
    });
    if (expenseCount === 0) {
      await this.prisma.category.createMany({
        data: DEFAULT_EXPENSE_CATEGORY_SEEDS.map((s) => ({
          userId,
          slug: s.slug,
          name: s.name,
          icon: s.icon,
          color: s.color,
          kind: s.kind,
        })),
        skipDuplicates: true,
      });
    }

    const incomeCount = await this.prisma.category.count({
      where: { userId, kind: TransactionType.INCOME },
    });
    if (incomeCount === 0) {
      await this.prisma.category.createMany({
        data: DEFAULT_INCOME_CATEGORY_SEEDS.map((s) => ({
          userId,
          slug: s.slug,
          name: s.name,
          icon: s.icon,
          color: s.color,
          kind: s.kind,
        })),
        skipDuplicates: true,
      });
    }

    // Idempotente: usuarios que ya tenían ingresos antes de existir esta categoría.
    // createMany + skipDuplicates evita P2002 (upsert compuesto fallaba si la fila ya existía en el mismo flujo).
    await this.prisma.category.createMany({
      data: [
        {
          userId,
          slug: 'intereses-inversion',
          name: 'Intereses de inversión',
          color: '#2dd4bf',
          kind: TransactionType.INCOME,
        },
      ],
      skipDuplicates: true,
    });
  }

  async listForUser(
    userId: string,
    includeArchived = false,
    kind?: TransactionType,
  ): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
        ...(kind ? { kind } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  parseKindQuery(raw: string | undefined): TransactionType | undefined {
    if (raw === undefined || raw === '') {
      return undefined;
    }
    const u = raw.trim().toUpperCase();
    if (u === 'EXPENSE' || u === 'INCOME') {
      return u as TransactionType;
    }
    throw new BadRequestException('kind debe ser EXPENSE o INCOME');
  }
}
