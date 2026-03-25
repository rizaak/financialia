-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'WHATSAPP', 'TELEGRAM', 'AI_ASSISTANT', 'IMPORT');

-- CreateEnum
CREATE TYPE "IngestionChannel" AS ENUM ('WHATSAPP', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('TEXT', 'IMAGE', 'VOICE');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth0_subject" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "default_currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "concept" TEXT NOT NULL,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "ai_confidence" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_portfolios" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_positions" (
    "id" UUID NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "initial_amount" DECIMAL(19,4) NOT NULL,
    "expected_annual_return_pct" DECIMAL(9,6) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_value_snapshots" (
    "id" UUID NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "total_value" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "portfolio_value_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "summary" TEXT NOT NULL,
    "structured" JSONB,
    "period_label" TEXT,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_messages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "IngestionChannel" NOT NULL,
    "external_message_id" TEXT NOT NULL,
    "media_kind" "MediaKind" NOT NULL,
    "raw_text" TEXT,
    "media_url" TEXT,
    "ocr_text" TEXT,
    "transcript_text" TEXT,
    "status" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "classified_payload" JSONB,
    "suggested_category_id" UUID,
    "transaction_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "ingestion_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0_subject_key" ON "users"("auth0_subject");

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_slug_key" ON "categories"("user_id", "slug");

-- CreateIndex
CREATE INDEX "transactions_user_id_occurred_at_idx" ON "transactions"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_category_id_idx" ON "transactions"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "investment_portfolios_user_id_idx" ON "investment_portfolios"("user_id");

-- CreateIndex
CREATE INDEX "investment_positions_portfolio_id_idx" ON "investment_positions"("portfolio_id");

-- CreateIndex
CREATE INDEX "portfolio_value_snapshots_portfolio_id_recorded_at_idx" ON "portfolio_value_snapshots"("portfolio_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_value_snapshots_portfolio_id_recorded_at_key" ON "portfolio_value_snapshots"("portfolio_id", "recorded_at");

-- CreateIndex
CREATE INDEX "ai_insights_user_id_created_at_idx" ON "ai_insights"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_messages_transaction_id_key" ON "ingestion_messages"("transaction_id");

-- CreateIndex
CREATE INDEX "ingestion_messages_user_id_created_at_idx" ON "ingestion_messages"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_messages_channel_external_message_id_key" ON "ingestion_messages"("channel", "external_message_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_portfolios" ADD CONSTRAINT "investment_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_positions" ADD CONSTRAINT "investment_positions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "investment_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_value_snapshots" ADD CONSTRAINT "portfolio_value_snapshots_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "investment_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_messages" ADD CONSTRAINT "ingestion_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_messages" ADD CONSTRAINT "ingestion_messages_suggested_category_id_fkey" FOREIGN KEY ("suggested_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_messages" ADD CONSTRAINT "ingestion_messages_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
