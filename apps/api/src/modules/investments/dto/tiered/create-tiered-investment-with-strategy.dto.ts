import { PayoutFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class TierDefinitionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualRatePct!: number;

  /** Límite superior acumulado; obligatorio salvo el último tramo (sin techo). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  upperLimit?: number | null;
}

export class CreateTieredInvestmentWithStrategyDto {
  @IsString()
  @Length(1, 120)
  strategyName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TierDefinitionDto)
  tiers!: TierDefinitionDto[];

  @IsUUID()
  originAccountId!: string;

  @IsOptional()
  @IsUUID()
  interestDestinationAccountId?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  initialDeposit!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsEnum(PayoutFrequency)
  payoutFrequency!: PayoutFrequency;

  @IsOptional()
  @IsBoolean()
  autoReinvest?: boolean;

  /** Por defecto true: el capital cuenta como liquidez inmediata. */
  @IsOptional()
  @IsBoolean()
  isLiquid?: boolean;

  /** Obligatoria si `isLiquid === false`. */
  @ValidateIf((o: CreateTieredInvestmentWithStrategyDto) => o.isLiquid === false)
  @IsDateString()
  maturityDate?: string;
}
