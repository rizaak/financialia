-- CreateEnum
CREATE TYPE "RecurringIncomeFrequency" AS ENUM ('QUINCENAL', 'MONTHLY');

-- CreateTable
CREATE TABLE "recurring_incomes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL DEFAULT 'Nómina',
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "frequency" "RecurringIncomeFrequency" NOT NULL,
    "payment_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "category_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "last_confirmed_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_incomes_user_id_is_archived_idx" ON "recurring_incomes"("user_id", "is_archived");

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
