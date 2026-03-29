-- AlterTable
ALTER TABLE "tiered_investments" ADD COLUMN     "is_liquid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maturity_date" TIMESTAMP(3);
