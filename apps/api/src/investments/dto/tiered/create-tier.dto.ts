import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateInvestmentTierDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  sortOrder!: number;

  /** Límite superior acumulado (null = sin techo). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  upperLimit?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  annualRatePct!: number;
}
