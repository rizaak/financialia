-- CreateEnum
CREATE TYPE "InstallmentPlanStatus" AS ENUM ('ACTIVE', 'PAID', 'CANCELLED');

-- AlterTable: nuevas columnas
ALTER TABLE "installment_plans" ADD COLUMN "total_installments" INTEGER;
ALTER TABLE "installment_plans" ADD COLUMN "current_installment" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "installment_plans" ADD COLUMN "status" "InstallmentPlanStatus" NOT NULL DEFAULT 'ACTIVE';

-- Backfill desde columnas legacy
UPDATE "installment_plans" SET "total_installments" = "total_months" WHERE "total_installments" IS NULL;
UPDATE "installment_plans" SET "current_installment" = GREATEST(1, "total_months" - "remaining_installments" + 1);
UPDATE "installment_plans" SET "status" = 'PAID' WHERE "remaining_installments" <= 0;

ALTER TABLE "installment_plans" ALTER COLUMN "total_installments" SET NOT NULL;

-- Drop legacy
ALTER TABLE "installment_plans" DROP COLUMN "total_months";
ALTER TABLE "installment_plans" DROP COLUMN "remaining_installments";
ALTER TABLE "installment_plans" DROP COLUMN "is_interest_free";
