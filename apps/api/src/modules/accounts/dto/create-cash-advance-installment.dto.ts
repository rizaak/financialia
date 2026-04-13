import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
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
import { TransactionSource } from '@prisma/client';

export enum CashAdvanceOperationKindDto {
  /** Disposición con tasa anual fija pactada (cuota nivelada). */
  IMMEDIATE_CASH_FIXED = 'IMMEDIATE_CASH_FIXED',
  /** Retiro en cajero: comisión opcional + tasa diaria (o tasa anual) para la cuota. */
  ATM_WITHDRAWAL = 'ATM_WITHDRAWAL',
}

export enum CashAdvanceRegistrationModeDto {
  /** Suma el retiro al saldo de la cuenta destino y registra la deuda en tarjeta. */
  INJECT_TO_ACCOUNT = 'INJECT_TO_ACCOUNT',
  /** Solo deuda y mensualidades; no modifica saldos de efectivo. */
  DEBT_ONLY = 'DEBT_ONLY',
}

export class CreateCashAdvanceInstallmentDto {
  @IsEnum(CashAdvanceOperationKindDto)
  operationKind!: CashAdvanceOperationKindDto;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  withdrawnAmount!: number;

  /** Tasa anual nominal (%). En cajero es opcional si indicas dailyRatePct. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestAnnualPct?: number;

  /** Tasa diaria (%). Retiro cajero; anual equivalente = diaria * 365 para la cuota. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRatePct?: number;

  @Type(() => Number)
  @IsInt()
  @IsIn([3, 6, 9, 12, 18, 24])
  totalInstallments!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dispositionFee?: number;

  @IsOptional()
  @IsEnum(CashAdvanceRegistrationModeDto)
  registrationMode?: CashAdvanceRegistrationModeDto;

  /** Mensualidad inicial del contador (1..totalInstallments). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  initialInstallment?: number;

  @ValidateIf(
    (o: CreateCashAdvanceInstallmentDto) =>
      (o.registrationMode ?? CashAdvanceRegistrationModeDto.INJECT_TO_ACCOUNT) ===
      CashAdvanceRegistrationModeDto.INJECT_TO_ACCOUNT,
  )
  @IsUUID()
  cashAccountId?: string;

  @IsUUID()
  expenseCategoryId!: string;

  @ValidateIf(
    (o: CreateCashAdvanceInstallmentDto) =>
      (o.registrationMode ?? CashAdvanceRegistrationModeDto.INJECT_TO_ACCOUNT) ===
      CashAdvanceRegistrationModeDto.INJECT_TO_ACCOUNT,
  )
  @IsUUID()
  incomeCategoryId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  concept?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;

  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource;
}
