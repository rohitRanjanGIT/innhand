import { boolean, index, integer, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { base } from "./_shared";
import { user } from "./auth";
import { colourways, finishEffectOptions } from "./finishes";
import { products, productVariants } from "./catalogue";
import { combos } from "./combos";

export const addresses = pgTable(
  "addresses",
  {
    ...base,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    name: text("name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2").notNull().default(""),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pin: text("pin").notNull(),
    phone: text("phone").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/** One active cart per owner (a user, or a guest cookie id). */
export const carts = pgTable(
  "carts",
  {
    ...base,
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    guestId: text("guest_id"),
    status: text("status", { enum: ["active", "merged", "ordered"] }).notNull().default("active"),
  },
  (t) => [
    uniqueIndex("carts_active_user").on(t.userId).where(sql`${t.status} = 'active' and ${t.userId} is not null`),
    uniqueIndex("carts_active_guest").on(t.guestId).where(sql`${t.status} = 'active' and ${t.guestId} is not null`),
  ],
);

export const cartBundles = pgTable("cart_bundles", {
  ...base,
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  /** `combo` is the admin's; `custom` is shopper-built. */
  kind: text("kind", { enum: ["combo", "custom"] }).notNull(),
  comboId: uuid("combo_id").references(() => combos.id, { onDelete: "set null" }),
  qty: integer("qty").notNull().default(1),
});

/** One variant in one colourway with one set of effects. Prices are never stored here. */
export const cartItems = pgTable(
  "cart_items",
  {
    ...base,
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    bundleId: uuid("bundle_id").references(() => cartBundles.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    colourwayId: uuid("colourway_id").references(() => colourways.id, { onDelete: "set null" }),
    qty: integer("qty").notNull().default(1),
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId)],
);

export const cartItemEffects = pgTable(
  "cart_item_effects",
  {
    cartItemId: uuid("cart_item_id")
      .notNull()
      .references(() => cartItems.id, { onDelete: "cascade" }),
    effectOptionId: uuid("effect_option_id")
      .notNull()
      .references(() => finishEffectOptions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cartItemId, t.effectOptionId] })],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    ...base,
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    guestId: text("guest_id"),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("wishlist_user_product").on(t.userId, t.productId).where(sql`${t.userId} is not null`),
    uniqueIndex("wishlist_guest_product").on(t.guestId, t.productId).where(sql`${t.guestId} is not null`),
  ],
);
