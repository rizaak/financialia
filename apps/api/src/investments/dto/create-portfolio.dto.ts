import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  baseCurrency?: string;
}
