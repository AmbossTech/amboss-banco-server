-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" VARCHAR NOT NULL,
    "password_hint" VARCHAR,
    "master_password_hash" VARCHAR NOT NULL,
    "protected_symmetric_key" VARCHAR NOT NULL,
    "refresh_token_hash" VARCHAR,
    "secp256k1_key_pair" JSONB NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_on_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_owner" BOOLEAN NOT NULL,
    "user_backup_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "money_address_user" VARCHAR,
    "secp256k1_key_pair" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "account_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,

    CONSTRAINT "wallet_on_accounts_pkey" PRIMARY KEY ("account_id","wallet_id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "money_address" VARCHAR NOT NULL,
    "wallet_on_accounts_id" UUID NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("wallet_on_accounts_id","money_address")
);

-- CreateTable
CREATE TABLE "contact_message" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_is_sender" BOOLEAN NOT NULL,
    "protected_message" VARCHAR NOT NULL,
    "contact_id" UUID,

    CONSTRAINT "contact_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_account" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR NOT NULL,
    "details" JSONB NOT NULL,
    "wallet_id" UUID NOT NULL,

    CONSTRAINT "wallet_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_account_swap" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "swap_completed" BOOLEAN NOT NULL DEFAULT false,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "wallet_account_id" UUID NOT NULL,

    CONSTRAINT "wallet_account_swap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_email_key" ON "account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_on_accounts_id_key" ON "wallet_on_accounts"("id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_on_accounts_money_address_user_key" ON "wallet_on_accounts"("money_address_user");

-- CreateIndex
CREATE UNIQUE INDEX "contact_id_key" ON "contact"("id");

-- AddForeignKey
ALTER TABLE "wallet_on_accounts" ADD CONSTRAINT "wallet_on_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_on_accounts" ADD CONSTRAINT "wallet_on_accounts_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_wallet_on_accounts_id_fkey" FOREIGN KEY ("wallet_on_accounts_id") REFERENCES "wallet_on_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_message" ADD CONSTRAINT "contact_message_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_account" ADD CONSTRAINT "wallet_account_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_account_swap" ADD CONSTRAINT "wallet_account_swap_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
