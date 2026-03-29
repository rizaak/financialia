-- AlterEnum: add WEEKLY to recurring event frequency (PostgreSQL 9.1+)
ALTER TYPE "RecurringEventFrequency" ADD VALUE IF NOT EXISTS 'WEEKLY';
