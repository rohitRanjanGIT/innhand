import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { base, sort } from "./_shared";

/** Mode `categories` mirrors the category tree; mode `manual` uses nav_groups and nav_links. */
export const navSections = pgTable("nav_sections", {
  ...base,
  heading: text("heading").notNull(),
  mode: text("mode", { enum: ["categories", "manual"] }).notNull().default("manual"),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

export const navGroups = pgTable("nav_groups", {
  ...base,
  sectionId: uuid("section_id")
    .notNull()
    .references(() => navSections.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** Shown in the accent colour (e.g. Diwali). */
  highlight: boolean("highlight").notNull().default(false),
  sort: sort(),
});

export const navTargetTypes = ["category", "tag", "product", "combo", "url"] as const;

export const navLinks = pgTable("nav_links", {
  ...base,
  groupId: uuid("group_id")
    .notNull()
    .references(() => navGroups.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  targetType: text("target_type", { enum: navTargetTypes }).notNull(),
  /** Id of the category, tag, product or combo. Empty for a typed URL. */
  targetId: uuid("target_id"),
  url: text("url"),
  sort: sort(),
});
