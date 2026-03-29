-- CreateTable
CREATE TABLE "credit_cards" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "closing_day" INTEGER NOT NULL,
    "payment_due_days_after_closing" INTEGER NOT NULL,
    "annual_interest_rate_pct" DECIMAL(9,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "remaining_installments" INTEGER NOT NULL,
    "monthly_amount" DECIMAL(19,4) NOT NULL,
    "interest_rate" DECIMAL(9,6) NOT NULL,
    "is_interest_free" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- Backfill credit_cards desde columnas legacy de accounts (antes de dropearlas)
INSERT INTO "credit_cards" ("id", "account_id", "closing_day", "payment_due_days_after_closing", "annual_interest_rate_pct", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    a."id",
    COALESCE(a."credit_closing_day", 1),
    20,
    0.36,
    NOW(),
    NOW()
FROM "accounts" a
WHERE a."type" = 'CREDIT_CARD';

CREATE UNIQUE INDEX "credit_cards_account_id_key" ON "credit_cards"("account_id");

CREATE INDEX "installment_plans_user_id_idx" ON "installment_plans"("user_id");

CREATE INDEX "installment_plans_account_id_idx" ON "installment_plans"("account_id");

ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (después del backfill)
ALTER TABLE "accounts" DROP COLUMN "credit_closing_day",
DROP COLUMN "credit_due_day";
