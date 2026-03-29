-- CreateEnum
CREATE TYPE "LoanKind" AS ENUM ('PERSONAL', 'MORTGAGE');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID_OFF');

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "LoanKind" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "total_amount" DECIMAL(19, 4) NOT NULL,
    "current_balance" DECIMAL(19, 4) NOT NULL,
    "interest_rate_annual" DECIMAL(9, 6) NOT NULL,
    "term_months" INTEGER NOT NULL,
    "monthly_payment" DECIMAL(19, 4) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_payments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_amount" DECIMAL(19, 4) NOT NULL,
    "principal_amount" DECIMAL(19, 4) NOT NULL,
    "interest_amount" DECIMAL(19, 4) NOT NULL,
    "insurance_amount" DECIMAL(19, 4) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loans_user_id_idx" ON "loans" ("user_id");

-- CreateIndex
CREATE INDEX "loans_user_id_status_idx" ON "loans" ("user_id", "status");

-- CreateIndex
CREATE INDEX "loan_payments_loan_id_paid_at_idx" ON "loan_payments" ("loan_id", "paid_at");

-- CreateIndex
CREATE INDEX "loan_payments_user_id_idx" ON "loan_payments" ("user_id");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
