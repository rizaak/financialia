import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';

class SavingsAdvicePeriodDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

class SavingsAdviceTotalsDto {
  @IsString()
  income!: string;

  @IsString()
  expense!: string;

  @IsString()
  net!: string;
}

class SavingsAdviceCategoryRowDto {
  @IsString()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  color!: string | null;

  @IsString()
  total!: string;
}

class SavingsAdviceSummaryDto {
  @ValidateNested()
  @Type(() => SavingsAdvicePeriodDto)
  period!: SavingsAdvicePeriodDto;

  @ValidateNested()
  @Type(() => SavingsAdviceTotalsDto)
  totals!: SavingsAdviceTotalsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavingsAdviceCategoryRowDto)
  expensesByCategory!: SavingsAdviceCategoryRowDto[];
}

export class SavingsAdviceDto {
  @ValidateNested()
  @Type(() => SavingsAdviceSummaryDto)
  summary!: SavingsAdviceSummaryDto;
}
