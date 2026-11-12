import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** A single row (id = 1). */
export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  /** SCC: how many secondary colour slots a finish may have. */
  secondaryColourCount: integer("secondary_colour_count").notNull().default(2),
  /** SEC: how many effect slots a finish may have. */
  effectCount: integer("effect_count").notNull().default(1),
  defaultCartLimit: integer("default_cart_limit").notNull().default(10),
  customCombosEnabled: boolean("custom_combos_enabled").notNull().default(true),
  shippingFee: integer("shipping_fee").notNull().default(99),
  freeShippingFrom: integer("free_shipping_from").notNull().default(1500),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
