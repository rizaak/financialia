-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'CREDIT_CARD';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "credit_closing_day" INTEGER,
ADD COLUMN     "credit_due_day" INTEGER,
ADD COLUMN     "credit_limit" DECIMAL(19,4);
