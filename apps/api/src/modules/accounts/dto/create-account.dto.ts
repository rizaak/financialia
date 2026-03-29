import { AccountType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  /** Obligatorio si `type` es CREDIT_CARD. */
  @ValidateIf((o: CreateAccountDto) => o.type === AccountType.CREDIT_CARD)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  /** Día de corte (1–31). Obligatorio para CREDIT_CARD. */
  @ValidateIf((o: CreateAccountDto) => o.type === AccountType.CREDIT_CARD)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number;

  /** Días naturales después del corte hasta la fecha límite de pago. Obligatorio para CREDIT_CARD. */
  @ValidateIf((o: CreateAccountDto) => o.type === AccountType.CREDIT_CARD)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  paymentDueDaysAfterClosing?: number;

  /** Tasa anual efectiva (ej. 0.45 = 45%). Obligatorio para CREDIT_CARD. */
  @ValidateIf((o: CreateAccountDto) => o.type === AccountType.CREDIT_CARD)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  annualInterestRatePct?: number;
}
