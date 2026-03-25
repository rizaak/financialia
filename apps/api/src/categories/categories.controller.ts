import { Controller, Get, Query } from '@nestjs/common';
import type { Category } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('kind') kindRaw?: string,
  ): Promise<Category[]> {
    const archived =
      includeArchived === 'true' || includeArchived === '1' || includeArchived === 'yes';
    const kind = this.categories.parseKindQuery(kindRaw);
    return this.categories.listForUser(userId, archived, kind);
  }
}
