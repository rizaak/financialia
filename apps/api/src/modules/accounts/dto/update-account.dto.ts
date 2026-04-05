import { AccountStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  /** Alinea el saldo con el valor indicado (reconciliación / transacción de ajuste si hay diferencia). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualBalance?: number;
}
