import { TransactionSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateInstallmentPlanDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  totalInstallments!: number;

  @IsUUID()
  categoryId!: string;

  @IsString()
  @Length(1, 200)
  concept!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  /** Primera mensualidad esperada; por defecto coincide con la fecha del movimiento. */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsBoolean()
  isInterestFree!: boolean;

  /** Ignorado si `isInterestFree` es true (MSI = tasa 0). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource;
}
