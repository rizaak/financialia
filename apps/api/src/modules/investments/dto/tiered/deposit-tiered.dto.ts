import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class DepositTieredInvestmentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;

  /** Si se omite, se usa la cuenta origen de la inversión. */
  @IsOptional()
  @IsUUID()
  fromAccountId?: string;
}
