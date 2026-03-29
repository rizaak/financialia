import { IsBoolean } from 'class-validator';

export class UpdateAutoReinvestDto {
  @IsBoolean()
  autoReinvest!: boolean;
}
