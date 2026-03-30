-- CreateEnum
CREATE TYPE "InvestmentPositionKind" AS ENUM ('VARIABLE', 'FIXED_TERM');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "invested_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "yield_strategy_id" UUID;

-- AlterTable
ALTER TABLE "investment_positions" ADD COLUMN     "agreed_annual_rate_pct" DECIMAL(9,6),
ADD COLUMN     "kind" "InvestmentPositionKind" NOT NULL DEFAULT 'VARIABLE',
ADD COLUMN     "market_value" DECIMAL(19,4),
ADD COLUMN     "maturity_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "investment_position_value_snapshots" (
    "id" UUID NOT NULL,
    "position_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "market_value" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "investment_position_value_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_position_value_snapshots_position_id_recorded_at_idx" ON "investment_position_value_snapshots"("position_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_yield_strategy_id_fkey" FOREIGN KEY ("yield_strategy_id") REFERENCES "investment_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_position_value_snapshots" ADD CONSTRAINT "investment_position_value_snapshots_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "investment_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
