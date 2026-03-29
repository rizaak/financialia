import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  fromAccountId!: string;

  @IsUUID()
  toAccountId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;

  /** Comisión cobrada en la cuenta origen (registrada como gasto en "Comisiones bancarias"). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee?: number;

  /**
   * Solo si el destino es tarjeta de crédito: intereses/cargos que el banco sumó a la deuda antes de tu pago.
   * Se registra como gasto en la TC y luego se aplica el abono `amount`.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditCardBankCharges?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;
}
