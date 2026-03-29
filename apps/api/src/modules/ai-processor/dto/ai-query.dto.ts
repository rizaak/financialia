import { IsString, MaxLength, MinLength } from 'class-validator';

export class AiQueryDto {
  @IsString()
  @MinLength(3, { message: 'La pregunta debe tener al menos 3 caracteres.' })
  @MaxLength(4000)
  q!: string;
}
