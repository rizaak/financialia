import { RecurringExpenseFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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

export class UpdateRecurringExpenseDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay?: number;

  @IsOptional()
  @IsEnum(RecurringExpenseFrequency)
  frequency?: RecurringExpenseFrequency;

  @ValidateIf(
    (o: UpdateRecurringExpenseDto) =>
      o.frequency === RecurringExpenseFrequency.ANNUAL ||
      o.frequency === RecurringExpenseFrequency.SEMIANNUAL,
  )
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  billingMonth?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  billingWeekday?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(999_999_999.9999)
  amount?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
