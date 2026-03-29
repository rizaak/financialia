import { RecurringIncomeFrequency } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateRecurringIncomeDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(999_999_999.9999)
  amount?: number;

  @IsOptional()
  @IsEnum(RecurringIncomeFrequency)
  frequency?: RecurringIncomeFrequency;

  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return value;
    if (Array.isArray(value)) {
      return value.map((v) => Number(v));
    }
    if (typeof value === 'string') {
      return value
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s));
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  paymentDays?: number[];

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
