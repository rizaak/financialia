import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateCreditCardAccountDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  /** Tasa anual efectiva en fracción (ej. 0.45 = 45%), coherente con alta de tarjeta. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  annualInterestRatePct?: number;
}
