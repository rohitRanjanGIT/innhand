import { boolean, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { base, sort } from "./_shared";
import { media } from "./catalogue";

export const colours = pgTable("colours", {
  ...base,
  name: text("name").notNull(),
  hex: text("hex").notNull(),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

export const finishes = pgTable("finishes", {
  ...base,
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

/** Position 0 is the base colour and always exists; 1..SCC are the named secondary slots. */
export const finishColourSlots = pgTable(
  "finish_colour_slots",
  {
    ...base,
    finishId: uuid("finish_id")
      .notNull()
      .references(() => finishes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
  },
  (t) => [unique("finish_colour_slot_position").on(t.finishId, t.position)],
);

/** The effects library ("Gold leaf"): a name and a picture. Prices live on each finish. */
export const effects = pgTable("effects", {
  ...base,
  name: text("name").notNull(),
  imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

/** Up to SEC named effect slots per finish ("Flakes", "Rim"). The shopper picks one effect per slot, or none. */
export const finishEffectSlots = pgTable(
  "finish_effect_slots",
  {
    ...base,
    finishId: uuid("finish_id")
      .notNull()
      .references(() => finishes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
  },
  (t) => [unique("finish_effect_slot_position").on(t.finishId, t.position)],
);

export const colourways = pgTable("colourways", {
  ...base,
  finishId: uuid("finish_id")
    .notNull()
    .references(() => finishes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

export const colourwayColours = pgTable(
  "colourway_colours",
  {
    ...base,
    colourwayId: uuid("colourway_id")
      .notNull()
      .references(() => colourways.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => finishColourSlots.id, { onDelete: "cascade" }),
    colourId: uuid("colour_id")
      .notNull()
      .references(() => colours.id, { onDelete: "restrict" }),
  },
  (t) => [unique("colourway_slot").on(t.colourwayId, t.slotId)],
);

/** Like a colourway: a named set with one library effect per effect slot, priced on the finish. */
export const effectCombinations = pgTable("effect_combinations", {
  ...base,
  finishId: uuid("finish_id")
    .notNull()
    .references(() => finishes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Whole rupees added per piece. */
  sellingPrice: integer("selling_price").notNull().default(0),
  /** Admin-only. Never selected by storefront reads. */
  costPrice: integer("cost_price"),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

export const effectCombinationEffects = pgTable(
  "effect_combination_effects",
  {
    ...base,
    combinationId: uuid("combination_id")
      .notNull()
      .references(() => effectCombinations.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => finishEffectSlots.id, { onDelete: "cascade" }),
    effectId: uuid("effect_id")
      .notNull()
      .references(() => effects.id, { onDelete: "restrict" }),
  },
  (t) => [unique("effect_combination_slot").on(t.combinationId, t.slotId)],
);

