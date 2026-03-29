-- Evolución: categoría FK, cuenta por defecto, frecuencia BIWEEKLY/YEARLY, isActive.

DROP TABLE IF EXISTS "recurring_events" CASCADE;

DROP TYPE IF EXISTS "RecurringEventBucket";

DROP TYPE IF EXISTS "RecurringEventFlowType";

DROP TYPE IF EXISTS "RecurringEventFrequency";

CREATE TYPE "RecurringEventType" AS ENUM ('EXPENSE', 'INCOME');

CREATE TYPE "RecurringEventFrequency" AS ENUM ('MONTHLY', 'BIWEEKLY', 'YEARLY');

CREATE TABLE "recurring_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "event_type" "RecurringEventType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "frequency" "RecurringEventFrequency" NOT NULL,
    "days_of_month" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "day_of_month" INTEGER,
    "day_of_week" INTEGER,
    "billing_month" INTEGER,
    "category_id" UUID NOT NULL,
    "default_account_id" UUID NOT NULL,
    "last_processed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recurring_events_user_id_is_active_idx" ON "recurring_events"("user_id", "is_active");

ALTER TABLE "recurring_events" ADD CONSTRAINT "recurring_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_events" ADD CONSTRAINT "recurring_events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_events" ADD CONSTRAINT "recurring_events_default_account_id_fkey" FOREIGN KEY ("default_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
