"use server";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { categories, combos, navGroups, navLinks, navSections, products, tags } from "@/db/schema";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { idSchema, idsSchema, navGroupSchema, navLinkSchema, navSectionSchema, reorderInSchema } from "./schemas/catalogue";

// ---------- Sections ----------

export const saveNavSection = adminAction(navSectionSchema, async ({ id, ...values }) => {
  if (id) {
    const [row] = await db.update(navSections).set(values).where(eq(navSections.id, id)).returning({ id: navSections.id });
    if (!row) throw new ActionError("That section no longer exists.");
  } else {
    const [{ top }] = await db.select({ top: max(navSections.sort) }).from(navSections);
    await db.insert(navSections).values({ ...values, sort: (top ?? -1) + 1 });
  }
  changed("nav");
});

export const reorderNavSections = adminAction(idsSchema, async ({ ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(navSections).set({ sort: i }).where(eq(navSections.id, id));
  });
  changed("nav");
});

/** Deletes the section with its groups and links. */
export const deleteNavSection = adminAction(idSchema, async ({ id }) => {
  await db.delete(navSections).where(eq(navSections.id, id));
  changed("nav");
});

// ---------- Groups ----------

export const saveNavGroup = adminAction(navGroupSchema, async ({ id, ...values }) => {
  const section = await db.query.navSections.findFirst({
    where: eq(navSections.id, values.sectionId),
    columns: { mode: true },
  });
  if (!section) throw new ActionError("That section no longer exists.");
  if (section.mode !== "manual") throw new ActionError("Groups belong to manual sections only.");
  if (id) {
    const [row] = await db
      .update(navGroups)
      .set({ title: values.title, highlight: values.highlight })
      .where(and(eq(navGroups.id, id), eq(navGroups.sectionId, values.sectionId)))
      .returning({ id: navGroups.id });
    if (!row) throw new ActionError("That group no longer exists.");
  } else {
    const [{ top }] = await db
      .select({ top: max(navGroups.sort) })
      .from(navGroups)
      .where(eq(navGroups.sectionId, values.sectionId));
    await db.insert(navGroups).values({ ...values, sort: (top ?? -1) + 1 });
  }
  changed("nav");
});

export const reorderNavGroups = adminAction(reorderInSchema, async ({ parentId, ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(navGroups)
        .set({ sort: i })
        .where(and(eq(navGroups.id, id), eq(navGroups.sectionId, parentId)));
  });
  changed("nav");
});

export const deleteNavGroup = adminAction(idSchema, async ({ id }) => {
  await db.delete(navGroups).where(eq(navGroups.id, id));
  changed("nav");
});

// ---------- Links ----------

const TARGET_TABLES = { category: categories, tag: tags, product: products, combo: combos } as const;

export const saveNavLink = adminAction(navLinkSchema, async ({ id, ...v }) => {
  const group = await db.$count(navGroups, eq(navGroups.id, v.groupId));
  if (!group) throw new ActionError("That group no longer exists.");

  const values =
    v.targetType === "url"
      ? { groupId: v.groupId, label: v.label, targetType: v.targetType, targetId: null, url: v.url }
      : { groupId: v.groupId, label: v.label, targetType: v.targetType, targetId: v.targetId, url: null };
  if (values.targetId) {
    const table = TARGET_TABLES[v.targetType as keyof typeof TARGET_TABLES];
    const exists = await db.$count(table, eq(table.id, values.targetId));
    if (!exists) throw new ActionError(`That ${v.targetType} no longer exists.`);
  }

  if (id) {
    const [row] = await db
      .update(navLinks)
      .set(values)
      .where(and(eq(navLinks.id, id), eq(navLinks.groupId, v.groupId)))
      .returning({ id: navLinks.id });
    if (!row) throw new ActionError("That link no longer exists.");
  } else {
    const [{ top }] = await db.select({ top: max(navLinks.sort) }).from(navLinks).where(eq(navLinks.groupId, v.groupId));
    await db.insert(navLinks).values({ ...values, sort: (top ?? -1) + 1 });
  }
  changed("nav");
});

export const reorderNavLinks = adminAction(reorderInSchema, async ({ parentId, ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(navLinks)
        .set({ sort: i })
        .where(and(eq(navLinks.id, id), eq(navLinks.groupId, parentId)));
  });
  changed("nav");
});

export const deleteNavLink = adminAction(idSchema, async ({ id }) => {
  await db.delete(navLinks).where(eq(navLinks.id, id));
  changed("nav");
});
