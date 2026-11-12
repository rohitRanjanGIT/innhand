import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, combos, media, navGroups, navLinks, navSections, products, tags, user } from "@/db/schema";
import { readSettingsUncached } from "@/lib/data/settings";
import { imageUrl } from "@/lib/images";
import { requireAdmin } from "@/lib/session";

// Admin reads for settings, categories, tags, navigation and shoppers.

export async function getAdminSettings() {
  await requireAdmin();
  const s = await readSettingsUncached();
  return {
    secondaryColourCount: s.secondaryColourCount,
    effectCount: s.effectCount,
    defaultCartLimit: s.defaultCartLimit,
    customCombosEnabled: s.customCombosEnabled,
    shippingFee: s.shippingFee,
    freeShippingFrom: s.freeShippingFrom,
    whatsappNumber: s.whatsappNumber,
    contactEmail: s.contactEmail,
  };
}

/** Head categories in order, each with its sub-categories in order. */
export async function getCategoryTree() {
  await requireAdmin();
  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      name: categories.name,
      slug: categories.slug,
      blurb: categories.blurb,
      bgColour: categories.bgColour,
      active: categories.active,
      imageId: categories.imageId,
      imageKey: media.r2Key,
      products: sql<number>`(select count(*)::int from products p where p.category_id = "categories"."id")`,
    })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .orderBy(asc(categories.sort), asc(categories.name));
  const withImg = rows.map(({ imageKey, ...r }) => ({ ...r, imageUrl: imageKey ? imageUrl(imageKey, "thumb") : null }));
  const heads = withImg.filter((r) => !r.parentId);
  return heads.map((h) => ({ ...h, children: withImg.filter((c) => c.parentId === h.id) }));
}
export type AdminCategoryHead = Awaited<ReturnType<typeof getCategoryTree>>[number];
export type AdminCategory = Omit<AdminCategoryHead, "children">;

export async function listTags() {
  await requireAdmin();
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      blurb: tags.blurb,
      imageId: tags.imageId,
      imageKey: media.r2Key,
      products: sql<number>`(select count(*)::int from product_tags pt where pt.tag_id = "tags"."id")`,
    })
    .from(tags)
    .leftJoin(media, eq(media.id, tags.imageId))
    .orderBy(asc(tags.name));
  return rows.map(({ imageKey, ...r }) => ({ ...r, imageUrl: imageKey ? imageUrl(imageKey, "thumb") : null }));
}
export type AdminTag = Awaited<ReturnType<typeof listTags>>[number];

/** Sections → groups → links, plus the rows a link can point at. */
export async function getNavEditor() {
  await requireAdmin();
  const [sections, cats, tagRows, productRows, comboRows] = await Promise.all([
    db.query.navSections.findMany({
      orderBy: [asc(navSections.sort), asc(navSections.heading)],
      with: {
        groups: {
          orderBy: [asc(navGroups.sort), asc(navGroups.title)],
          with: { links: { orderBy: [asc(navLinks.sort), asc(navLinks.label)] } },
        },
      },
    }),
    db
      .select({ id: categories.id, name: categories.name, parentId: categories.parentId, sort: categories.sort })
      .from(categories)
      .orderBy(asc(categories.sort), asc(categories.name)),
    db.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)),
    db
      .select({ id: products.id, name: products.name, status: products.status })
      .from(products)
      .orderBy(asc(products.name)),
    db.select({ id: combos.id, name: combos.name, status: combos.status }).from(combos).orderBy(asc(combos.name)),
  ]);

  // Categories listed as "Head" then "Head › Sub".
  const heads = cats.filter((c) => !c.parentId);
  const categoryOptions = heads.flatMap((h) => [
    { id: h.id, name: h.name },
    ...cats.filter((c) => c.parentId === h.id).map((c) => ({ id: c.id, name: `${h.name} › ${c.name}` })),
  ]);

  return {
    sections: sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      mode: s.mode,
      active: s.active,
      groups: s.groups.map((g) => ({
        id: g.id,
        title: g.title,
        highlight: g.highlight,
        links: g.links.map((l) => ({
          id: l.id,
          label: l.label,
          targetType: l.targetType,
          targetId: l.targetId,
          url: l.url,
        })),
      })),
    })),
    targets: {
      category: categoryOptions,
      tag: tagRows,
      product: productRows.map((p) => ({ id: p.id, name: p.status === "active" ? p.name : `${p.name} (${p.status})` })),
      combo: comboRows.map((c) => ({ id: c.id, name: c.status === "active" ? c.name : `${c.name} (${c.status})` })),
    },
  };
}
export type NavEditorData = Awaited<ReturnType<typeof getNavEditor>>;

/** Shoppers (role customer), newest first. `q` filters by name or email. */
export async function listShoppers(q = "", limit = 500) {
  await requireAdmin();
  const term = q.trim().replace(/[\\%_]/g, (c) => `\\${c}`); // match \ % _ literally
  const where = term
    ? and(eq(user.role, "customer"), or(ilike(user.name, `%${term}%`), ilike(user.email, `%${term}%`)))
    : eq(user.role, "customer");
  const [rows, total] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.emailVerified,
        hasPhone: sql<boolean>`coalesce(${user.phone}, '') <> ''`,
        joined: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit),
    db.$count(user, where),
  ]);
  return { rows, total };
}
export type AdminShopper = Awaited<ReturnType<typeof listShoppers>>["rows"][number];

