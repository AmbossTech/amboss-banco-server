-- CreateTable
CREATE TABLE "wallet_account_swap" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "wallet_account_id" UUID NOT NULL,

    CONSTRAINT "wallet_account_swap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wallet_account_swap" ADD CONSTRAINT "wallet_account_swap_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
