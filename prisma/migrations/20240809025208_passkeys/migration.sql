-- CreateTable
CREATE TABLE "account_passkey" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "encryption_available" BOOLEAN NOT NULL,
    "protected_symmetric_key" VARCHAR,
    "payload" JSONB NOT NULL,

    CONSTRAINT "account_passkey_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "account_passkey" ADD CONSTRAINT "account_passkey_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
