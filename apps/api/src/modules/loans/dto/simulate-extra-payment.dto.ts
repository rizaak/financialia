import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum PrepaymentStrategy {
  /** Cuota fija; el plazo se acorta. */
  REDUCE_TERM = 'REDUCE_TERM',
  /** Plazo fijo; se recalcula una cuota menor (PMT sobre saldo nuevo). */
  REDUCE_PAYMENT = 'REDUCE_PAYMENT',
}

export class SimulateExtraPaymentDto {
  /** Abono único a capital aplicado hoy sobre el saldo insoluto. */
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  extraAmount!: number;

  @IsOptional()
  @IsEnum(PrepaymentStrategy)
  strategy?: PrepaymentStrategy;
}
