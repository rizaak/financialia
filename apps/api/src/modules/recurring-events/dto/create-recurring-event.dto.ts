import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { RecurringEventFrequency, RecurringEventType } from '@prisma/client';

export class CreateRecurringEventDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsEnum(RecurringEventType)
  type!: RecurringEventType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(999_999_999.9999)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsEnum(RecurringEventFrequency)
  frequency!: RecurringEventFrequency;

  @ValidateIf((o: CreateRecurringEventDto) => o.frequency !== 'WEEKLY')
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => Number(v));
    }
    if (typeof value === 'string') {
      return value
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s));
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  daysOfMonth?: number[];

  /** Un solo día de cobro (mensual/anual). Si no envías `daysOfMonth`, basta con este campo. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ValidateIf((o: CreateRecurringEventDto) => o.frequency === 'WEEKLY')
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  billingMonth?: number;

  @IsUUID()
  categoryId!: string;

  @IsUUID()
  defaultAccountId!: string;
}
