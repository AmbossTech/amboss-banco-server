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
    "refresh_token_hash" VARCHAR,
    "secp256k1_key_pair" JSONB NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_on_accounts" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_owner" BOOLEAN NOT NULL,
    "lightning_address" VARCHAR,
    "secp256k1_key_pair" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "account_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,

    CONSTRAINT "wallet_on_accounts_pkey" PRIMARY KEY ("account_id","wallet_id")
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

-- CreateIndex
CREATE UNIQUE INDEX "account_email_key" ON "account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_on_accounts_lightning_address_key" ON "wallet_on_accounts"("lightning_address");

-- AddForeignKey
ALTER TABLE "wallet_on_accounts" ADD CONSTRAINT "wallet_on_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_on_accounts" ADD CONSTRAINT "wallet_on_accounts_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_account" ADD CONSTRAINT "wallet_account_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
