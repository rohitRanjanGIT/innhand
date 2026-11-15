CREATE TABLE "effect_combination_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"combination_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"effect_id" uuid NOT NULL,
	CONSTRAINT "effect_combination_slot" UNIQUE("combination_id","slot_id")
);
--> statement-breakpoint
CREATE TABLE "effect_combinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finish_id" uuid NOT NULL,
	"name" text NOT NULL,
	"selling_price" integer DEFAULT 0 NOT NULL,
	"cost_price" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "effect_combination_id" uuid;--> statement-breakpoint
ALTER TABLE "effect_combination_effects" ADD CONSTRAINT "effect_combination_effects_combination_id_effect_combinations_id_fk" FOREIGN KEY ("combination_id") REFERENCES "public"."effect_combinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_combination_effects" ADD CONSTRAINT "effect_combination_effects_slot_id_finish_effect_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."finish_effect_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_combination_effects" ADD CONSTRAINT "effect_combination_effects_effect_id_effects_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_combinations" ADD CONSTRAINT "effect_combinations_finish_id_finishes_id_fk" FOREIGN KEY ("finish_id") REFERENCES "public"."finishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_effect_combination_id_effect_combinations_id_fk" FOREIGN KEY ("effect_combination_id") REFERENCES "public"."effect_combinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Each effect ticked in a slot becomes a combination named after it, with that one effect and its prices.
-- The combination reuses the old row's id so cart lines can follow it.
INSERT INTO "effect_combinations" ("id", "finish_id", "name", "selling_price", "cost_price", "sort", "active")
SELECT fe."id", fe."finish_id", e."name", fe."selling_price", fe."cost_price",
  (row_number() OVER (PARTITION BY fe."finish_id" ORDER BY s."position", fe."sort") - 1)::int, fe."active"
FROM "finish_effects" fe
JOIN "effects" e ON e."id" = fe."effect_id"
JOIN "finish_effect_slots" s ON s."id" = fe."slot_id";--> statement-breakpoint
INSERT INTO "effect_combination_effects" ("combination_id", "slot_id", "effect_id")
SELECT fe."id", fe."slot_id", fe."effect_id" FROM "finish_effects" fe;--> statement-breakpoint
UPDATE "cart_items" ci SET "effect_combination_id" = (
  SELECT cie."finish_effect_id" FROM "cart_item_effects" cie WHERE cie."cart_item_id" = ci."id" LIMIT 1);--> statement-breakpoint
DROP TABLE "cart_item_effects";--> statement-breakpoint
DROP TABLE "finish_effects";
