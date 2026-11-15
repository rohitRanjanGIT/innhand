CREATE TABLE "finish_effect_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finish_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "finish_effect_slot_position" UNIQUE("finish_id","position")
);
--> statement-breakpoint
ALTER TABLE "finish_effects" DROP CONSTRAINT "finish_effect_pair";--> statement-breakpoint
ALTER TABLE "finish_effects" ADD COLUMN "slot_id" uuid;--> statement-breakpoint
-- Every finish that already offers effects gets one slot, "Effect", holding them all.
INSERT INTO "finish_effect_slots" ("finish_id", "position", "label")
SELECT DISTINCT "finish_id", 0, 'Effect' FROM "finish_effects";--> statement-breakpoint
UPDATE "finish_effects" fe SET "slot_id" = s."id"
FROM "finish_effect_slots" s WHERE s."finish_id" = fe."finish_id";--> statement-breakpoint
ALTER TABLE "finish_effects" ALTER COLUMN "slot_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "finish_effect_slots" ADD CONSTRAINT "finish_effect_slots_finish_id_finishes_id_fk" FOREIGN KEY ("finish_id") REFERENCES "public"."finishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finish_effects" ADD CONSTRAINT "finish_effects_slot_id_finish_effect_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."finish_effect_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finish_effects" ADD CONSTRAINT "finish_effect_slot_pair" UNIQUE("slot_id","effect_id");