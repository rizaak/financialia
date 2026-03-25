-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'WALLET', 'CASH');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Una cuenta por usuario con el saldo que estaba en users.net_balance
INSERT INTO "accounts" ("id", "user_id", "name", "type", "currency", "balance", "created_at", "updated_at")
SELECT gen_random_uuid(), u.id, 'Cuenta principal', 'CASH'::"AccountType", u.default_currency, u.net_balance, NOW(), NOW()
FROM "users" u;

CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- transactions.account_id
ALTER TABLE "transactions" ADD COLUMN "account_id" UUID;

UPDATE "transactions" t
SET "account_id" = a.id
FROM "accounts" a
WHERE a.user_id = t.user_id;

ALTER TABLE "transactions" ALTER COLUMN "account_id" SET NOT NULL;

CREATE INDEX "transactions_account_id_idx" ON "transactions"("account_id");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- tiered_investments
ALTER TABLE "tiered_investments" ADD COLUMN "origin_account_id" UUID;
ALTER TABLE "tiered_investments" ADD COLUMN "interest_destination_account_id" UUID;

UPDATE "tiered_investments" ti
SET "origin_account_id" = a.id
FROM "accounts" a
WHERE a.user_id = ti.user_id;

ALTER TABLE "tiered_investments" ALTER COLUMN "origin_account_id" SET NOT NULL;

CREATE INDEX "tiered_investments_origin_account_id_idx" ON "tiered_investments"("origin_account_id");

ALTER TABLE "tiered_investments" ADD CONSTRAINT "tiered_investments_origin_account_id_fkey" FOREIGN KEY ("origin_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tiered_investments" ADD CONSTRAINT "tiered_investments_interest_destination_account_id_fkey" FOREIGN KEY ("interest_destination_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users" DROP COLUMN "net_balance";
