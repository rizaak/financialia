import { PayoutFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
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
} from 'class-validator';

export class CreateTieredInvestmentDto {
  @IsUUID()
  strategyId!: string;

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

  @IsOptional()
  @IsBoolean()
  isLiquid?: boolean;

  @ValidateIf((o: CreateTieredInvestmentDto) => o.isLiquid === false)
  @IsDateString()
  maturityDate?: string;
}
