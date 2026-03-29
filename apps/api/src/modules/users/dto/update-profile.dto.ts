import { RiskTolerance } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  baseCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999_999_999)
  monthlyBudget?: number;

  @IsOptional()
  @IsEnum(RiskTolerance)
  riskTolerance?: RiskTolerance;

  @IsOptional()
  @IsString()
  @Length(2, 16)
  language?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  hideBalances?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 2048)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  displayName?: string;
}
