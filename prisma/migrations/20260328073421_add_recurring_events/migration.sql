-- CreateEnum
CREATE TYPE "RecurringEventFlowType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "RecurringEventFrequency" AS ENUM ('MONTHLY', 'QUINCENAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "RecurringEventBucket" AS ENUM ('HOGAR', 'ENTRETENIMIENTO', 'SALARIO');

-- CreateTable
CREATE TABLE "recurring_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "event_type" "RecurringEventFlowType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "frequency" "RecurringEventFrequency" NOT NULL,
    "days_of_month" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "billing_month" INTEGER,
    "category" "RecurringEventBucket" NOT NULL,
    "account_id" UUID NOT NULL,
    "last_processed_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_events_user_id_is_archived_idx" ON "recurring_events"("user_id", "is_archived");

-- AddForeignKey
ALTER TABLE "recurring_events" ADD CONSTRAINT "recurring_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_events" ADD CONSTRAINT "recurring_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
