-- AlterTable
ALTER TABLE "categories" ADD COLUMN "kind" "TransactionType" NOT NULL DEFAULT 'EXPENSE';

-- DropIndex
DROP INDEX "categories_user_id_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_slug_kind_key" ON "categories"("user_id", "slug", "kind");

-- CreateIndex
CREATE INDEX "categories_user_id_kind_idx" ON "categories"("user_id", "kind");
