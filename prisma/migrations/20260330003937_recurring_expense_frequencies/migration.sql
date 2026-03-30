-- AlterEnum
ALTER TYPE "RecurringExpenseFrequency" ADD VALUE 'DAILY';
ALTER TYPE "RecurringExpenseFrequency" ADD VALUE 'WEEKLY';
ALTER TYPE "RecurringExpenseFrequency" ADD VALUE 'QUINCENAL';
ALTER TYPE "RecurringExpenseFrequency" ADD VALUE 'SEMIANNUAL';

-- AlterTable
ALTER TABLE "recurring_expenses" ADD COLUMN "billing_weekday" INTEGER;
