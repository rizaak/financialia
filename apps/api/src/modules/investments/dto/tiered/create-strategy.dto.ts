import { IsString, Length } from 'class-validator';

export class CreateInvestmentStrategyDto {
  @IsString()
  @Length(1, 120)
  name!: string;
}
