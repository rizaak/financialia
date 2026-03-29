import { BadRequestException } from '@nestjs/common';
import type { RecurringEvent } from '@prisma/client';
import { normalizePaymentDays } from '../recurring-incomes/recurring-incomes.utils';
import type { CreateRecurringEventDto } from './dto/create-recurring-event.dto';
import type { UpdateRecurringEventDto } from './dto/update-recurring-event.dto';

/** Quincena por defecto: día 15 y último día del mes (31 se ajusta vía `paymentDayMatches`). */
export const BIWEEKLY_DEFAULT_DAYS_OF_MONTH: readonly [number, number] = [15, 31];

export function resolveCreateScheduleDays(dto: CreateRecurringEventDto): number[] {
  const f = dto.frequency;
  if (f === 'WEEKLY') {
    return [];
  }
  if (f === 'BIWEEKLY') {
    if (dto.daysOfMonth != null && dto.daysOfMonth.length > 0) {
      return normalizePaymentDays(dto.daysOfMonth);
    }
    return normalizePaymentDays([...BIWEEKLY_DEFAULT_DAYS_OF_MONTH]);
  }
  if (dto.daysOfMonth != null && dto.daysOfMonth.length > 0) {
    return normalizePaymentDays(dto.daysOfMonth);
  }
  if (dto.dayOfMonth != null) {
    return normalizePaymentDays([dto.dayOfMonth]);
  }
  throw new BadRequestException(
    'Indica daysOfMonth o dayOfMonth. Para quincenal (BIWEEKLY) puedes omitirlos: se usan el 15 y el último día del mes.',
  );
}

export function resolveUpdateScheduleDays(
  existing: RecurringEvent,
  dto: UpdateRecurringEventDto,
): number[] {
  const finalFreq = dto.frequency ?? existing.frequency;
  if (finalFreq === 'WEEKLY') {
    return [];
  }
  if (dto.daysOfMonth != null) {
    return normalizePaymentDays(dto.daysOfMonth);
  }
  if (dto.dayOfMonth != null && (finalFreq === 'MONTHLY' || finalFreq === 'YEARLY')) {
    return normalizePaymentDays([dto.dayOfMonth]);
  }
  if (finalFreq === 'BIWEEKLY' && existing.frequency !== 'BIWEEKLY') {
    return normalizePaymentDays([...BIWEEKLY_DEFAULT_DAYS_OF_MONTH]);
  }
  return existing.daysOfMonth;
}
