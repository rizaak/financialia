import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class MoveToCajitaDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  amount!: number;
}
