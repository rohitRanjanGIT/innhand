import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { base, sort } from "./_shared";
import { media, productFinishes, products } from "./catalogue";

export const discountTypes = ["amount", "percent"] as const;

/** The admin's ready-made combos. The saving is stored, not a fixed price (shoppers can change finishes). */
export const combos = pgTable("combos", {
  ...base,
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  discountType: text("discount_type", { enum: discountTypes }).notNull().default("amount"),
  discountValue: integer("discount_value").notNull().default(0),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
  sort: sort(),
});

/** 2 to 4 rows per combo. */
export const comboItems = pgTable("combo_items", {
  ...base,
  comboId: uuid("combo_id")
    .notNull()
    .references(() => combos.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  defaultProductFinishId: uuid("default_product_finish_id").references(() => productFinishes.id, {
    onDelete: "set null",
  }),
  defaultSetSize: integer("default_set_size").notNull().default(1),
  sort: sort(),
});

export const comboImages = pgTable("combo_images", {
  ...base,
  comboId: uuid("combo_id")
    .notNull()
    .references(() => combos.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "restrict" }),
  sort: sort(),
});

/** Three rows (item_count 2, 3, 4) for shopper-built combos. */
export const comboDiscountTiers = pgTable("combo_discount_tiers", {
  ...base,
  itemCount: integer("item_count").notNull().unique(),
  discountType: text("discount_type", { enum: discountTypes }).notNull().default("percent"),
  discountValue: integer("discount_value").notNull().default(0),
});
