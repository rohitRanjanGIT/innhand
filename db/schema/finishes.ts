import { boolean, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { base, sort } from "./_shared";

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

export const finishEffectSlots = pgTable(
  "finish_effect_slots",
  {
    ...base,
    finishId: uuid("finish_id")
      .notNull()
      .references(() => finishes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    required: boolean("required").notNull().default(false),
  },
  (t) => [unique("finish_effect_slot_position").on(t.finishId, t.position)],
);

export const finishEffectOptions = pgTable("finish_effect_options", {
  ...base,
  slotId: uuid("slot_id")
    .notNull()
    .references(() => finishEffectSlots.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Rupees added per piece. */
  extraPrice: integer("extra_price").notNull().default(0),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

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
