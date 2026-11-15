CREATE TABLE "effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"image_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finish_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finish_id" uuid NOT NULL,
	"effect_id" uuid NOT NULL,
	"selling_price" integer DEFAULT 0 NOT NULL,
	"cost_price" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "finish_effect_pair" UNIQUE("finish_id","effect_id")
);
--> statement-breakpoint
ALTER TABLE "cart_item_effects" ADD COLUMN "finish_effect_id" uuid;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finish_effects" ADD CONSTRAINT "finish_effects_finish_id_finishes_id_fk" FOREIGN KEY ("finish_id") REFERENCES "public"."finishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finish_effects" ADD CONSTRAINT "finish_effects_effect_id_effects_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item_effects" ADD CONSTRAINT "cart_item_effects_finish_effect_id_finish_effects_id_fk" FOREIGN KEY ("finish_effect_id") REFERENCES "public"."finish_effects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Copy today's effect options into the library: one effect per distinct name, skipping a free "None".
INSERT INTO "effects" ("name", "sort")
SELECT o."name", (row_number() OVER (ORDER BY min(o."sort"), o."name") - 1)::int
FROM "finish_effect_options" o
WHERE NOT (lower(trim(o."name")) = 'none' AND o."extra_price" = 0)
GROUP BY o."name";--> statement-breakpoint
-- Each old option becomes that effect on its finish, its extra price now the selling price.
INSERT INTO "finish_effects" ("finish_id", "effect_id", "selling_price", "sort", "active")
SELECT DISTINCT ON (s."finish_id", e."id") s."finish_id", e."id", o."extra_price", s."position" * 100 + o."sort", o."active"
FROM "finish_effect_options" o
JOIN "finish_effect_slots" s ON s."id" = o."slot_id"
JOIN "effects" e ON e."name" = o."name"
ORDER BY s."finish_id", e."id", s."position", o."sort";--> statement-breakpoint
-- SEC now counts effects, not slots: raise it if a finish already offers more.
UPDATE "store_settings" SET "effect_count" = GREATEST("effect_count",
  COALESCE((SELECT max(n) FROM (SELECT count(*)::int AS n FROM "finish_effects" GROUP BY "finish_id") t), 0));--> statement-breakpoint
-- Point cart lines at the new rows. Lines that held a skipped "None" lose that row; a line keeps one effect.
UPDATE "cart_item_effects" c SET "finish_effect_id" = fe."id"
FROM "finish_effect_options" o
JOIN "finish_effect_slots" s ON s."id" = o."slot_id"
JOIN "effects" e ON e."name" = o."name"
JOIN "finish_effects" fe ON fe."finish_id" = s."finish_id" AND fe."effect_id" = e."id"
WHERE o."id" = c."effect_option_id";--> statement-breakpoint
DELETE FROM "cart_item_effects" WHERE "finish_effect_id" IS NULL;--> statement-breakpoint
DELETE FROM "cart_item_effects" a USING "cart_item_effects" b
WHERE a."cart_item_id" = b."cart_item_id" AND a.ctid > b.ctid;--> statement-breakpoint
ALTER TABLE "cart_item_effects" DROP CONSTRAINT "cart_item_effects_effect_option_id_finish_effect_options_id_fk";--> statement-breakpoint
ALTER TABLE "cart_item_effects" DROP CONSTRAINT "cart_item_effects_cart_item_id_effect_option_id_pk";--> statement-breakpoint
ALTER TABLE "cart_item_effects" DROP COLUMN "effect_option_id";--> statement-breakpoint
ALTER TABLE "cart_item_effects" ALTER COLUMN "finish_effect_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_item_effects" ADD CONSTRAINT "cart_item_effects_cart_item_id_finish_effect_id_pk" PRIMARY KEY("cart_item_id","finish_effect_id");--> statement-breakpoint
DROP TABLE "finish_effect_options";--> statement-breakpoint
DROP TABLE "finish_effect_slots";
