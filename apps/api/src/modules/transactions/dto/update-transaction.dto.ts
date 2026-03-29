import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Cambiar la cuenta del movimiento (misma moneda). */
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  /** Solo compra MSI: nuevo número de meses (recalcula la cuota). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(60)
  totalInstallments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(999_999_999.9999)
  amount?: number;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  concept?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string | null;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
