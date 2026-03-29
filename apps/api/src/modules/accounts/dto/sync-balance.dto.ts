import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

/** Saldo real que ves en el banco (misma convención que `Account.balance`: en TC es la deuda). */
export class SyncBalanceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(-999_999_999.9999)
  @Max(999_999_999.9999)
  actualBalance!: number;
}
