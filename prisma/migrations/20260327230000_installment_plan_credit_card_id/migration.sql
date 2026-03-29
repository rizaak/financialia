-- Quitar denormalización por usuario (el vínculo es vía cuenta tarjeta)
ALTER TABLE "installment_plans" DROP CONSTRAINT IF EXISTS "installment_plans_user_id_fkey";
ALTER TABLE "installment_plans" DROP COLUMN IF EXISTS "user_id";

-- Renombrar FK cuenta → credit_card_id
ALTER TABLE "installment_plans" DROP CONSTRAINT IF EXISTS "installment_plans_account_id_fkey";
ALTER TABLE "installment_plans" RENAME COLUMN "account_id" TO "credit_card_id";
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Descripción obligatoria
UPDATE "installment_plans" SET "description" = COALESCE("description", '');
ALTER TABLE "installment_plans" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "installment_plans" ALTER COLUMN "description" SET DEFAULT '';

-- Plan siempre ligado a transacción (eliminar huérfanos sin tx)
DELETE FROM "installment_plans" WHERE "transaction_id" IS NULL;
ALTER TABLE "installment_plans" DROP CONSTRAINT IF EXISTS "installment_plans_transaction_id_fkey";
ALTER TABLE "installment_plans" ALTER COLUMN "transaction_id" SET NOT NULL;
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
