ALTER TYPE "public"."wallet_status" ADD VALUE 'pending_funding';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_chat_id" text;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "charge_cents" integer;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_telegram_chat_id_unique" UNIQUE("telegram_chat_id");