-- CreateEnum
CREATE TYPE "PayoutFrequency" AS ENUM ('DAILY', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "TieredInvestmentTxType" AS ENUM ('DEPOSIT', 'INTEREST_REINVEST', 'INTEREST_PAYOUT_TO_CASH');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "net_balance" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "investment_strategies" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_tiers" (
    "id" UUID NOT NULL,
    "strategy_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "upper_limit" DECIMAL(19,4),
    "annual_rate_pct" DECIMAL(9,4) NOT NULL,

    CONSTRAINT "investment_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiered_investments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "strategy_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "principal" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "payout_frequency" "PayoutFrequency" NOT NULL,
    "auto_reinvest" BOOLEAN NOT NULL DEFAULT false,
    "daily_estimated_earnings" DECIMAL(19,8),
    "effective_annual_pct" DECIMAL(12,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiered_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiered_investment_transactions" (
    "id" UUID NOT NULL,
    "tiered_investment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "TieredInvestmentTxType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "linked_transaction_id" UUID,

    CONSTRAINT "tiered_investment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_tiers_strategy_id_sort_order_key" ON "investment_tiers"("strategy_id", "sort_order");

-- CreateIndex
CREATE INDEX "investment_tiers_strategy_id_idx" ON "investment_tiers"("strategy_id");

-- CreateIndex
CREATE INDEX "investment_strategies_user_id_idx" ON "investment_strategies"("user_id");

-- CreateIndex
CREATE INDEX "tiered_investments_user_id_idx" ON "tiered_investments"("user_id");

-- CreateIndex
CREATE INDEX "tiered_investments_strategy_id_idx" ON "tiered_investments"("strategy_id");

-- CreateIndex
CREATE UNIQUE INDEX "tiered_investment_transactions_linked_transaction_id_key" ON "tiered_investment_transactions"("linked_transaction_id");

-- CreateIndex
CREATE INDEX "tiered_investment_transactions_investment_id_occurred_at_idx" ON "tiered_investment_transactions"("tiered_investment_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tiered_investment_transactions_user_id_idx" ON "tiered_investment_transactions"("user_id");

-- AddForeignKey
ALTER TABLE "investment_strategies" ADD CONSTRAINT "investment_strategies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_tiers" ADD CONSTRAINT "investment_tiers_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "investment_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiered_investments" ADD CONSTRAINT "tiered_investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiered_investments" ADD CONSTRAINT "tiered_investments_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "investment_strategies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiered_investment_transactions" ADD CONSTRAINT "tiered_investment_transactions_tiered_investment_id_fkey" FOREIGN KEY ("tiered_investment_id") REFERENCES "tiered_investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiered_investment_transactions" ADD CONSTRAINT "tiered_investment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiered_investment_transactions" ADD CONSTRAINT "tiered_investment_transactions_linked_transaction_id_fkey" FOREIGN KEY ("linked_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Opcional (ejecutar manualmente si quieres alinear saldo con movimientos ya existentes):
-- UPDATE "users" u SET "net_balance" = s.t FROM (
--   SELECT "user_id", COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE -"amount" END), 0) AS t
--   FROM "transactions" GROUP BY "user_id"
-- ) s WHERE u.id = s.user_id;
