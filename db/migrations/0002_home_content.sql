CREATE TABLE "home_sections" (
	"key" text PRIMARY KEY NOT NULL,
	"eyebrow" text DEFAULT '' NOT NULL,
	"heading" text DEFAULT '' NOT NULL,
	"heading_emphasis" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cta_label" text DEFAULT '' NOT NULL,
	"cta_url" text DEFAULT '' NOT NULL,
	"handle" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"video_key" text,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"image_id" uuid,
	"customer_name" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"rating" integer,
	"accent_colour" text DEFAULT '#D7A49A' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"image_id" uuid,
	"link_url" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_sections" ADD CONSTRAINT "home_sections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;