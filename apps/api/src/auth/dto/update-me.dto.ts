import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @IsIn(['USD', 'MXN'])
  defaultCurrency?: string;
}
