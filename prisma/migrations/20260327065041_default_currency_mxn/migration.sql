-- DropIndex
DROP INDEX "categories_user_id_idx";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "currency" SET DEFAULT 'MXN';

-- AlterTable
ALTER TABLE "investment_portfolios" ALTER COLUMN "base_currency" SET DEFAULT 'MXN';

-- AlterTable
ALTER TABLE "tiered_investments" ALTER COLUMN "currency" SET DEFAULT 'MXN';

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "currency" SET DEFAULT 'MXN';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "default_currency" SET DEFAULT 'MXN';

-- RenameIndex
ALTER INDEX "tiered_investment_transactions_investment_id_occurred_at_idx" RENAME TO "tiered_investment_transactions_tiered_investment_id_occurre_idx";
