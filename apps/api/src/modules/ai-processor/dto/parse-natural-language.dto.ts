import { IsString, Length } from 'class-validator';

export class ParseNaturalLanguageDto {
  @IsString()
  @Length(1, 4000)
  text!: string;
}
