import { LoanKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLoanDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(LoanKind)
  kind!: LoanKind;

  /** Monto original del crédito (capital inicial). */
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  /** Capital pendiente; si se omite, se asume igual al monto original. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentBalance?: number;

  /** Tasa anual en fracción (ej. 0.089 = 8.9%). */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  interestRateAnnual!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(600)
  termMonths!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monthlyPayment!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
