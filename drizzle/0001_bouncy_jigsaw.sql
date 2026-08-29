ALTER TABLE "workflows" ADD COLUMN "org_id" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "graph" text;