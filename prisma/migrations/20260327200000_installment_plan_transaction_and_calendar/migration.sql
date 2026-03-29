-- AlterTable
ALTER TABLE "installment_plans" ADD COLUMN "transaction_id" UUID;
ALTER TABLE "installment_plans" ADD COLUMN "total_months" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "installment_plans" ADD COLUMN "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill plazos y fechas
UPDATE "installment_plans" SET "total_months" = GREATEST("remaining_installments", 1);
UPDATE "installment_plans" SET "start_date" = "created_at";

-- Enlazar con el movimiento de compra si existe metadata.installmentPlanId
UPDATE "installment_plans" AS p
SET "transaction_id" = t."id"
FROM "transactions" AS t
WHERE t."metadata" IS NOT NULL
  AND (t."metadata"::jsonb->>'installmentPlanId') = p."id"::text
  AND p."transaction_id" IS NULL;

ALTER TABLE "installment_plans" ALTER COLUMN "total_months" DROP DEFAULT;
ALTER TABLE "installment_plans" ALTER COLUMN "start_date" DROP DEFAULT;

CREATE UNIQUE INDEX "installment_plans_transaction_id_key" ON "installment_plans"("transaction_id");

ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
