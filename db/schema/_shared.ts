import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

/** `id`, `created_at`, `updated_at` — every app table has these. */
export const base = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** A number the admin controls by dragging. */
export const sort = () => integer("sort").notNull().default(0);
