CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" VARCHAR NOT NULL,
    "password_hint" VARCHAR,
    "master_password_hash" VARCHAR NOT NULL,
    "symmetric_key_iv" VARCHAR NOT NULL,
    "protected_symmetric_key" VARCHAR NOT NULL,
    "key_pair" JSONB NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_email_key" ON "account"("email");
