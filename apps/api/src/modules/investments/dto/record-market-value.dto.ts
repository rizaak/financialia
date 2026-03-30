import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class RecordMarketValueDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  marketValue!: number;
}
