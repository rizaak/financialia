import { AccountStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAccountDto {
  @IsEnum(AccountStatus)
  status!: AccountStatus;
}
