import { type AnyPgColumn, boolean, index, integer, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";
import { base, sort } from "./_shared";
import { colourways, finishes } from "./finishes";

/** Every uploaded image. The key only; URLs are built in lib/images.ts. */
export const media = pgTable("media", {
  ...base,
  /** The image id used in R2 paths: originals/<key>, <key>/thumb.webp … */
  r2Key: text("r2_key").notNull().unique(),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  bytes: integer("bytes").notNull().default(0),
  alt: text("alt").notNull().default(""),
  /** False until the WebP sizes have been written. */
  processed: boolean("processed").notNull().default(false),
});

/** `parent_id` empty means head category. Two levels only. */
export const categories = pgTable(
  "categories",
  {
    ...base,
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    blurb: text("blurb").notNull().default(""),
    imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
    bgColour: text("bg_colour").notNull().default("#E1DAD3"),
    sort: sort(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

export const tags = pgTable("tags", {
  ...base,
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  blurb: text("blurb").notNull().default(""),
  imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
});

export const productStatus = ["draft", "active", "archived"] as const;

export const products = pgTable(
  "products",
  {
    ...base,
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** The sub-category. */
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    blurb: text("blurb").notNull().default(""),
    description: text("description").notNull().default(""),
    sizeText: text("size_text").notNull().default(""),
    /** Empty means use store_settings.default_cart_limit. */
    cartLimit: integer("cart_limit"),
    soldInSets: boolean("sold_in_sets").notNull().default(false),
    comboEligible: boolean("combo_eligible").notNull().default(true),
    status: text("status", { enum: productStatus }).notNull().default("draft"),
    /** Empty means not featured; lower shows first. */
    featuredRank: integer("featured_rank"),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
  },
  (t) => [index("products_category_idx").on(t.categoryId), index("products_status_idx").on(t.status)],
);

export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.tagId] })],
);

export const productFinishes = pgTable(
  "product_finishes",
  {
    ...base,
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    finishId: uuid("finish_id")
      .notNull()
      .references(() => finishes.id, { onDelete: "restrict" }),
    sort: sort(),
    isDefault: boolean("is_default").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (t) => [unique("product_finish").on(t.productId, t.finishId)],
);

export const productFinishImages = pgTable("product_finish_images", {
  ...base,
  productFinishId: uuid("product_finish_id")
    .notNull()
    .references(() => productFinishes.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "restrict" }),
  sort: sort(),
  /** If set, picking this colourway shows this image. */
  colourwayId: uuid("colourway_id").references(() => colourways.id, { onDelete: "set null" }),
});

/** The price grid: one row per finish per set size. Empty price means "price on request". */
export const productVariants = pgTable(
  "product_variants",
  {
    ...base,
    productFinishId: uuid("product_finish_id")
      .notNull()
      .references(() => productFinishes.id, { onDelete: "cascade" }),
    setSize: integer("set_size").notNull().default(1),
    price: integer("price"),
    /** Admin only. Never selected by storefront reads. */
    costPrice: integer("cost_price"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [unique("variant_finish_set").on(t.productFinishId, t.setSize)],
);

export const productRelated = pgTable(
  "product_related",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sort: sort(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.relatedProductId] })],
);
