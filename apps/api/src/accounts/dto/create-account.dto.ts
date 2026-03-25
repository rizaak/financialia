import { AccountType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
