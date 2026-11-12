import "server-only";
// Storefront catalogue reads. Every read selects named columns only, so cost_price never leaves the
// database. Products in draft or archived never show. The exported getters are `'use cache'` with
// tags from lib/cache-tags.ts; the `load*` functions are the uncached reads (used by scripts/tests).
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, media, productRelated, products, tags } from "@/db/schema";
import { listingPrice } from "@/lib/pricing";
import { TAGS } from "@/lib/cache-tags";
import type {
  CategoryNode,
  CategoryTree,
  Occasion,
  ProductDetail,
  ProductFinishOption,
  ProductTile,
} from "./types";

// ---------------------------------------------------------------------------------------------
// Categories

export async function loadCategories(): Promise<CategoryNode[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      blurb: categories.blurb,
      bgColour: categories.bgColour,
      parentId: categories.parentId,
      sort: categories.sort,
      image: media.r2Key,
    })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sort), asc(categories.name));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows
    .filter((r) => !r.parentId || byId.has(r.parentId)) // a child of a hidden head is hidden too
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      href: `/shop/${r.slug}`,
      blurb: r.blurb,
      bgColour: r.bgColour,
      image: r.image,
      parentId: r.parentId,
      group: r.parentId ? byId.get(r.parentId)!.name : r.name,
    }));
}

/** Every active category, head categories and sub-categories, in the admin's order. */
export async function getCategories() {
  "use cache";
  cacheTag(TAGS.categories);
  cacheLife("hours");
  return loadCategories();
}

export function toTree(all: CategoryNode[]): CategoryTree {
  return all.filter((c) => !c.parentId).map((h) => ({ ...h, children: all.filter((c) => c.parentId === h.id) }));
}

export async function getCategoryTree(): Promise<CategoryTree> {
  return toTree(await getCategories());
}

/** Sub-categories in order (the shop's chips and the home page's tiles). */
export async function getSubCategories() {
  return (await getCategoryTree()).flatMap((h) => h.children);
}

export async function getCategory(slug: string) {
  const all = await getCategories();
  const c = all.find((x) => x.slug === slug);
  if (!c) return null;
  return {
    ...c,
    parent: c.parentId ? (all.find((x) => x.id === c.parentId) ?? null) : null,
    children: all.filter((x) => x.parentId === c.id),
  };
}

// ---------------------------------------------------------------------------------------------
// Tags (occasions)

export async function loadOccasions(): Promise<Occasion[]> {
  const rows = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, blurb: tags.blurb, image: media.r2Key })
    .from(tags)
    .leftJoin(media, eq(media.id, tags.imageId))
    .where(eq(tags.active, true))
    .orderBy(asc(tags.sort), asc(tags.name));
  return rows.map((t) => ({ ...t, href: `/occasions/${t.slug}` }));
}

export async function getOccasions() {
  "use cache";
  // Tags have no tag of their own; admin tag saves expire `products` and `nav`.
  cacheTag(TAGS.products, TAGS.nav);
  cacheLife("hours");
  return loadOccasions();
}

export async function getOccasion(slug: string) {
  return (await getOccasions()).find((t) => t.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Product tiles

// A shopper sees a product's active finishes of active finishes, and their active variants.
export async function loadTiles(): Promise<ProductTile[]> {
  const [cats, rows] = await Promise.all([
    loadCategoriesAll(),
    db.query.products.findMany({
      where: (p, { eq: e }) => e(p.status, "active"),
      columns: { id: true, slug: true, name: true, categoryId: true, featuredRank: true },
      with: {
        tags: { columns: { tagId: true } },
        finishes: {
          where: (pf, { eq: e }) => e(pf.active, true),
          columns: { id: true, isDefault: true, sort: true },
          orderBy: (pf, { asc: a }) => [a(pf.sort)],
          with: {
            finish: { columns: { active: true } },
            images: {
              columns: { sort: true, colourwayId: true },
              orderBy: (i, { asc: a }) => [a(i.sort)],
              with: { media: { columns: { r2Key: true } } },
            },
            variants: { where: (v, { eq: e }) => e(v.active, true), columns: { price: true } },
          },
        },
      },
    }),
  ]);
  const catById = new Map(cats.map((c) => [c.id, c]));

  const tiles = rows.map((p): ProductTile & { sortKey: [number, number, string] } => {
    const finishes = p.finishes.filter((f) => f.finish.active);
    const main = finishes.find((f) => f.isDefault) ?? finishes[0];
    const mainImage =
      main?.images.find((i) => !i.colourwayId) ?? main?.images[0] ?? finishes.flatMap((f) => f.images)[0];
    const sub = p.categoryId ? catById.get(p.categoryId) : undefined;
    const head = sub?.parentId ? catById.get(sub.parentId) : sub;
    const { price, from } = listingPrice(finishes.flatMap((f) => f.variants.map((v) => v.price)));
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      href: `/products/${p.slug}`,
      category: head?.name ?? "",
      categoryId: sub?.id ?? null,
      categorySlug: sub?.slug ?? null,
      headCategoryId: head?.id ?? null,
      tagIds: p.tags.map((t) => t.tagId),
      image: mainImage?.media.r2Key ?? null,
      price,
      from,
      featuredRank: p.featuredRank,
      sortKey: [head?.sort ?? 9999, sub?.sort ?? 9999, p.name],
    };
  });
  tiles.sort(
    (a, b) => a.sortKey[0] - b.sortKey[0] || a.sortKey[1] - b.sortKey[1] || a.sortKey[2].localeCompare(b.sortKey[2]),
  );
  return tiles.map(({ sortKey: _, ...t }) => t);
}

/** Categories including inactive ones (a product in a hidden category still shows its group). */
async function loadCategoriesAll() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId, sort: categories.sort })
    .from(categories);
}

/** Every active product as a tile, in category order. */
export async function getProductTiles() {
  "use cache";
  cacheTag(TAGS.products, TAGS.categories);
  cacheLife("hours");
  return loadTiles();
}

/** A sub-category's products, or for a head category every product in its sub-categories. */
export async function getProductsInCategory(categoryId: string) {
  const tiles = await getProductTiles();
  return tiles.filter((t) => t.categoryId === categoryId || t.headCategoryId === categoryId);
}

export async function getProductsWithTag(tagId: string) {
  return (await getProductTiles()).filter((t) => t.tagIds.includes(tagId));
}

/** Products with a featured rank, best first. */
export async function getFeaturedProducts() {
  const tiles = await getProductTiles();
  return tiles
    .filter((t) => t.featuredRank !== null)
    .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0));
}

// ---------------------------------------------------------------------------------------------
// Product detail

export async function loadProduct(slug: string): Promise<ProductDetail | null> {
  const p = await db.query.products.findFirst({
    where: (t, { and: all, eq: e }) => all(e(t.slug, slug), e(t.status, "active")),
    columns: {
      id: true,
      slug: true,
      name: true,
      blurb: true,
      description: true,
      sizeText: true,
      soldInSets: true,
      cartLimit: true,
      seoTitle: true,
      seoDescription: true,
      categoryId: true,
    },
    with: {
      category: {
        columns: { name: true, slug: true, active: true },
        with: { parent: { columns: { name: true } } },
      },
      finishes: {
        where: (pf, { eq: e }) => e(pf.active, true),
        columns: { id: true, isDefault: true, sort: true },
        orderBy: (pf, { asc: a }) => [a(pf.sort)],
        with: {
          finish: {
            columns: { name: true, description: true, active: true },
            with: {
              colourSlots: {
                columns: { id: true, label: true, position: true },
                orderBy: (s, { asc: a }) => [a(s.position)],
              },
              effectSlots: {
                columns: { id: true, label: true, required: true, position: true },
                orderBy: (s, { asc: a }) => [a(s.position)],
                with: {
                  options: {
                    where: (o, { eq: e }) => e(o.active, true),
                    columns: { id: true, name: true, extraPrice: true },
                    orderBy: (o, { asc: a }) => [a(o.sort), a(o.name)],
                  },
                },
              },
              colourways: {
                where: (c, { eq: e }) => e(c.active, true),
                columns: { id: true, name: true },
                orderBy: (c, { asc: a }) => [a(c.sort), a(c.name)],
                with: {
                  colours: {
                    columns: { slotId: true },
                    with: { colour: { columns: { name: true, hex: true } } },
                  },
                },
              },
            },
          },
          images: {
            columns: { colourwayId: true },
            orderBy: (i, { asc: a }) => [a(i.sort)],
            with: { media: { columns: { r2Key: true, alt: true } } },
          },
          variants: {
            where: (v, { eq: e }) => e(v.active, true),
            columns: { id: true, setSize: true, price: true },
            orderBy: (v, { asc: a }) => [a(v.setSize)],
          },
        },
      },
    },
  });
  if (!p) return null;

  const finishes: ProductFinishOption[] = p.finishes
    .filter((pf) => pf.finish.active && pf.variants.length > 0)
    .map((pf) => {
      const slotLabel = new Map(pf.finish.colourSlots.map((s) => [s.id, s]));
      return {
        productFinishId: pf.id,
        name: pf.finish.name,
        description: pf.finish.description,
        isDefault: pf.isDefault,
        images: pf.images.map((i) => ({ key: i.media.r2Key, alt: i.media.alt, colourwayId: i.colourwayId })),
        colourways: pf.finish.colourways.map((cw) => ({
          id: cw.id,
          name: cw.name,
          swatches: cw.colours
            .filter((c) => slotLabel.has(c.slotId))
            .sort((a, b) => slotLabel.get(a.slotId)!.position - slotLabel.get(b.slotId)!.position)
            .map((c) => ({ slotLabel: slotLabel.get(c.slotId)!.label, name: c.colour.name, hex: c.colour.hex })),
        })),
        effectSlots: pf.finish.effectSlots
          .filter((s) => s.options.length > 0)
          .map((s) => ({ id: s.id, label: s.label, required: s.required, options: s.options })),
        variants: pf.variants.map((v) => ({ id: v.id, setSize: v.setSize, price: v.price })),
      };
    });
  // Default finish first.
  finishes.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    blurb: p.blurb,
    description: p.description,
    sizeText: p.sizeText,
    soldInSets: p.soldInSets,
    cartLimit: p.cartLimit,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    group: p.category?.parent?.name ?? p.category?.name ?? "",
    category:
      p.category && p.category.active
        ? { name: p.category.name, slug: p.category.slug, href: `/shop/${p.category.slug}` }
        : null,
    finishes,
  };
}

export async function getProduct(slug: string) {
  "use cache";
  cacheTag(TAGS.products, TAGS.product(slug), TAGS.finishes, TAGS.categories);
  cacheLife("hours");
  return loadProduct(slug);
}

/** Slugs for generateStaticParams. */
export async function getProductSlugs() {
  return (await getProductTiles()).map((t) => t.slug);
}

// ---------------------------------------------------------------------------------------------
// Similar products

/**
 * Up to `limit` tiles: the hand-picked ones first, then same sub-category, then shared tags, then
 * same head category.
 */
export function pickSimilar(product: ProductTile, handPicked: string[], tiles: ProductTile[], limit = 4) {
  const others = tiles.filter((t) => t.id !== product.id);
  const out: ProductTile[] = [];
  const add = (list: ProductTile[]) => {
    for (const t of list) {
      if (out.length >= limit) return;
      if (!out.some((o) => o.id === t.id)) out.push(t);
    }
  };
  add(handPicked.flatMap((id) => others.find((t) => t.id === id) ?? []));
  if (product.categoryId) add(others.filter((t) => t.categoryId === product.categoryId));
  if (product.tagIds.length) {
    // More shared tags first.
    const shared = (t: ProductTile) => t.tagIds.filter((id) => product.tagIds.includes(id)).length;
    add(others.filter((t) => shared(t) > 0).sort((a, b) => shared(b) - shared(a)));
  }
  if (product.headCategoryId) add(others.filter((t) => t.headCategoryId === product.headCategoryId));
  return out;
}

export async function loadHandPicked(productId: string) {
  const rows = await db
    .select({ id: productRelated.relatedProductId })
    .from(productRelated)
    .innerJoin(products, eq(products.id, productRelated.relatedProductId))
    .where(and(eq(productRelated.productId, productId), eq(products.status, "active")))
    .orderBy(asc(productRelated.sort));
  return rows.map((r) => r.id);
}

export async function getSimilarProducts(slug: string) {
  "use cache";
  cacheTag(TAGS.products, TAGS.product(slug));
  cacheLife("hours");
  const tiles = await getProductTiles();
  const product = tiles.find((t) => t.slug === slug);
  if (!product) return [];
  return pickSimilar(product, await loadHandPicked(product.id), tiles);
}

/** Tiles for a set of product ids (wishlist), in the order given. Hidden products drop out. */
export async function getTilesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const tiles = await getProductTiles();
  return ids.flatMap((id) => tiles.find((t) => t.id === id) ?? []);
}
