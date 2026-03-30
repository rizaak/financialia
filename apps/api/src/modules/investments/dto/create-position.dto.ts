import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { InvestmentPositionKind } from '@prisma/client';

export class CreatePositionDto {
  @IsString()
  @Length(1, 120)
  label!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  initialAmount!: number;

  /// Tasa anual esperada en decimal (ej. 0.075 = 7.5% anual)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-0.9999)
  @Max(10)
  expectedAnnualReturnPct!: number;

  @IsOptional()
  @IsEnum(InvestmentPositionKind)
  kind?: InvestmentPositionKind;

  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(10)
  agreedAnnualRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  marketValue?: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}
