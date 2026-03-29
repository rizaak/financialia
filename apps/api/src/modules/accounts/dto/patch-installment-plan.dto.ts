import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class PatchInstallmentPlanDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  monthlyAmount?: number;

  /** Pagos que faltan (incluye la cuota en curso). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  remainingInstallments?: number;

  @IsOptional()
  @IsBoolean()
  cancel?: boolean;
}
