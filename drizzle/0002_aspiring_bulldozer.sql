ALTER TABLE "workflows" DROP CONSTRAINT "workflows_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workflows" DROP COLUMN "user_id";