import { RecurringExpenseFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateRecurringExpenseDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay!: number;

  @IsEnum(RecurringExpenseFrequency)
  frequency!: RecurringExpenseFrequency;

  @ValidateIf(
    (o: CreateRecurringExpenseDto) =>
      o.frequency === RecurringExpenseFrequency.ANNUAL ||
      o.frequency === RecurringExpenseFrequency.SEMIANNUAL,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  billingMonth?: number;

  @ValidateIf((o: CreateRecurringExpenseDto) => o.frequency === RecurringExpenseFrequency.WEEKLY)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  billingWeekday?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(999_999_999.9999)
  amount!: number;

  @IsUUID()
  categoryId!: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
