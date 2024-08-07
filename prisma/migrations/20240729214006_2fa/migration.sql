-- CreateEnum
CREATE TYPE "two_fa_method" AS ENUM ('OTP', 'PASSKEY');

-- CreateTable
CREATE TABLE "account_2fa" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_id" UUID NOT NULL,
    "method" "two_fa_method" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "payload" JSONB NOT NULL,

    CONSTRAINT "account_2fa_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "account_2fa" ADD CONSTRAINT "account_2fa_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
