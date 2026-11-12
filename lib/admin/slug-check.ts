import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories, finishes, tags } from "@/db/schema";
import { ActionError } from "./action";

const TABLES = { finish: finishes, category: categories, tag: tags } as const;

/** Throws a friendly error when another row of that kind already uses the slug. */
export async function assertSlugFree(kind: keyof typeof TABLES, slug: string, exceptId?: string) {
  const t = TABLES[kind];
  const [row] = await db
    .select({ name: t.name })
    .from(t)
    .where(exceptId ? and(eq(t.slug, slug), ne(t.id, exceptId)) : eq(t.slug, slug))
    .limit(1);
  if (row) throw new ActionError(`The slug "${slug}" is already used by the ${kind} "${row.name}".`);
}
