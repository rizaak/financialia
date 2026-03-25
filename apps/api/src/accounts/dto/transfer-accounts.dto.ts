import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class TransferAccountsDto {
  @IsUUID()
  fromAccountId!: string;

  @IsUUID()
  toAccountId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;
}
