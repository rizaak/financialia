import { TransactionSource, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  accountId!: string;

  @IsUUID()
  categoryId!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(999_999_999.9999)
  amount!: number;

  @IsString()
  @Length(1, 500)
  concept!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource;

  /** MSI / diferidos: solo con tarjeta de crédito y gasto. */
  @IsOptional()
  @IsBoolean()
  isInstallment?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  @Max(60)
  totalInstallments?: number;

  /** true = MSI sin intereses (tasa 0). Si es false, usa planInterestRate. */
  @IsOptional()
  @IsBoolean()
  installmentInterestFree?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  planInterestRate?: number;
}
