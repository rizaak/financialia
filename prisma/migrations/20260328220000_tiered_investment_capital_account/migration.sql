-- AlterTable
ALTER TABLE "tiered_investments" ADD COLUMN "capital_account_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "tiered_investments_capital_account_id_key" ON "tiered_investments"("capital_account_id");

-- AddForeignKey
ALTER TABLE "tiered_investments" ADD CONSTRAINT "tiered_investments_capital_account_id_fkey" FOREIGN KEY ("capital_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
