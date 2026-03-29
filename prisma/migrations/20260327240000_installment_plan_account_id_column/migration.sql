-- Alinear nombre de columna con dominio: cuenta tarjeta (account_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'installment_plans'
      AND column_name = 'credit_card_id'
  ) THEN
    ALTER TABLE "installment_plans" DROP CONSTRAINT IF EXISTS "installment_plans_credit_card_id_fkey";
    ALTER TABLE "installment_plans" RENAME COLUMN "credit_card_id" TO "account_id";
    ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
