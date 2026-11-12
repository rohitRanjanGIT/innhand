import "server-only";
// Header, side menu and footer menus, from nav_sections / nav_groups / nav_links.
// Mode `categories` mirrors the category tree; mode `manual` resolves each link's target to a URL.
import { cacheLife, cacheTag } from "next/cache";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { combos, navGroups, navLinks, navSections, products, tags } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { loadCategories, toTree } from "./catalogue";
import type { MenuGroup, MenuSection } from "./types";

type Target = { type: "category" | "tag" | "product" | "combo" | "url"; id: string | null; url: string | null };

export async function loadNav(): Promise<MenuSection[]> {
  const sections = await db
    .select({ id: navSections.id, heading: navSections.heading, mode: navSections.mode })
    .from(navSections)
    .where(eq(navSections.active, true))
    .orderBy(asc(navSections.sort));
  if (sections.length === 0) return [];

  const manualIds = sections.filter((s) => s.mode === "manual").map((s) => s.id);
  const groups = manualIds.length
    ? await db
        .select({ id: navGroups.id, sectionId: navGroups.sectionId, title: navGroups.title, highlight: navGroups.highlight })
        .from(navGroups)
        .where(inArray(navGroups.sectionId, manualIds))
        .orderBy(asc(navGroups.sort))
    : [];
  const links = groups.length
    ? await db
        .select({
          groupId: navLinks.groupId,
          label: navLinks.label,
          type: navLinks.targetType,
          id: navLinks.targetId,
          url: navLinks.url,
        })
        .from(navLinks)
        .where(
          inArray(
            navLinks.groupId,
            groups.map((g) => g.id),
          ),
        )
        .orderBy(asc(navLinks.sort))
    : [];

  const idsOf = (type: Target["type"]) => [...new Set(links.filter((l) => l.type === type && l.id).map((l) => l.id!))];
  const [cats, tagRows, productRows, comboRows] = await Promise.all([
    loadCategories(),
    db.select({ id: tags.id, slug: tags.slug, name: tags.name }).from(tags).where(eq(tags.active, true)),
    idsOf("product").length
      ? db
          .select({ id: products.id, slug: products.slug, status: products.status })
          .from(products)
          .where(inArray(products.id, idsOf("product")))
      : [],
    idsOf("combo").length
      ? db
          .select({ id: combos.id, slug: combos.slug, status: combos.status })
          .from(combos)
          .where(inArray(combos.id, idsOf("combo")))
      : [],
  ]);

  /** Null when the target is gone or hidden, so the link is left out. */
  const hrefOf = (t: Target): string | null => {
    switch (t.type) {
      case "category": {
        const c = cats.find((x) => x.id === t.id);
        return c ? `/shop/${c.slug}` : null;
      }
      case "tag": {
        const x = tagRows.find((r) => r.id === t.id);
        return x ? `/occasions/${x.slug}` : null;
      }
      case "product": {
        const x = productRows.find((r) => r.id === t.id && r.status === "active");
        return x ? `/products/${x.slug}` : null;
      }
      case "combo": {
        const x = comboRows.find((r) => r.id === t.id && r.status === "active");
        return x ? `/combos/${x.slug}` : null;
      }
      case "url":
        return t.url?.trim() || null;
    }
  };

  const tree = toTree(cats);
  return sections.map((s): MenuSection => {
    if (s.mode === "categories") {
      return {
        heading: s.heading,
        mode: "categories",
        groups: tree.map((h) => ({
          title: h.name,
          href: h.href,
          highlight: false,
          links: h.children.map((c) => ({ label: c.name, href: c.href })),
        })),
      };
    }
    return {
      heading: s.heading,
      mode: "manual",
      groups: groups
        .filter((g) => g.sectionId === s.id)
        .map((g): MenuGroup => {
          const groupLinks = links
            .filter((l) => l.groupId === g.id)
            .flatMap((l) => {
              const href = hrefOf(l);
              return href ? [{ label: l.label, href }] : [];
            });
          // A group title links to the occasion or category of the same name, else its first link.
          const named = (n: string) => n.trim().toLowerCase();
          const sameTag = tagRows.find((t) => named(t.name) === named(g.title));
          const sameCat = cats.find((c) => named(c.name) === named(g.title));
          const href = sameTag ? `/occasions/${sameTag.slug}` : sameCat ? sameCat.href : (groupLinks[0]?.href ?? "/shop");
          return { title: g.title, href, highlight: g.highlight, links: groupLinks };
        }),
    };
  });
}

/** Every active menu section, in order. */
export async function getNav() {
  "use cache";
  cacheTag(TAGS.nav, TAGS.categories, TAGS.products, TAGS.combos);
  cacheLife("hours");
  return loadNav();
}
