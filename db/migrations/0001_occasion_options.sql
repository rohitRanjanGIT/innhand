ALTER TABLE "tags" ADD COLUMN "bg_colour" text DEFAULT '#E1DAD3' NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "sort" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "active" boolean DEFAULT true NOT NULL;