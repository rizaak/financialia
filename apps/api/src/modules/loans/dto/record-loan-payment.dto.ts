import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LoanPaymentBreakdownDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  principal!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interest!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insurance!: number;
}

export class RecordLoanPaymentDto {
  /**
   * Monto de la mensualidad (capital + interés + seguros del periodo).
   * El total desembolsado = amount + (extraToPrincipal ?? 0).
   */
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  /** Abono adicional a capital (opcional), aparte del capital de la mensualidad. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  extraToPrincipal?: number;

  @IsObject()
  @ValidateNested()
  @Type(() => LoanPaymentBreakdownDto)
  breakdown!: LoanPaymentBreakdownDto;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
