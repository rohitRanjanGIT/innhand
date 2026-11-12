import "server-only";
// Admin reads for the product screens. Each starts with requireAdmin(). These are the only reads
// that select cost_price; storefront code must never import this file.
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  comboItems,
  cartItems,
  finishes,
  productFinishes,
  products,
  productVariants,
  tags,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { listingPrice } from "@/lib/pricing";
import { priceKey, type ProductStatus, type ProductValues } from "@/lib/validation/product";

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  categoryId: string | null;
  categoryName: string | null;
  headCategoryName: string | null;
  thumbKey: string | null;
  finishesCount: number;
  price: { price: number | null; from: boolean };
  featuredRank: number | null;
  updatedAt: string;
};

/** Every product for the admin table. Small catalogue, so filtering happens in the browser. */
export async function listAdminProducts(): Promise<AdminProductRow[]> {
  await requireAdmin();
  const rows = await db.query.products.findMany({
    columns: { id: true, name: true, slug: true, status: true, categoryId: true, featuredRank: true, updatedAt: true },
    orderBy: [asc(products.name)],
    with: {
      category: { columns: { name: true }, with: { parent: { columns: { name: true } } } },
      finishes: {
        columns: { isDefault: true, active: true, sort: true },
        orderBy: [asc(productFinishes.sort)],
        with: {
          images: { columns: {}, orderBy: (i, { asc }) => [asc(i.sort)], limit: 1, with: { media: { columns: { r2Key: true } } } },
          variants: { columns: { price: true, active: true } },
        },
      },
    },
  });
  return rows.map((p) => {
    const active = p.finishes.filter((f) => f.active);
    const def = active.find((f) => f.isDefault) ?? active[0];
    const thumb = def?.images[0]?.media.r2Key ?? active.find((f) => f.images[0])?.images[0]?.media.r2Key ?? null;
    const prices = active.flatMap((f) => f.variants.filter((v) => v.active).map((v) => v.price));
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      headCategoryName: p.category?.parent?.name ?? null,
      thumbKey: thumb,
      finishesCount: active.length,
      price: listingPrice(prices),
      featuredRank: p.featuredRank,
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

export type CategoryOption = { id: string; name: string; active: boolean; children: { id: string; name: string; active: boolean }[] };
export type TagOption = { id: string; name: string };
export type FinishOption = {
  id: string;
  name: string;
  active: boolean;
  colourways: { id: string; name: string; active: boolean; hexes: string[] }[];
};
export type RelatedOption = { id: string; name: string; slug: string; status: ProductStatus; thumbKey: string | null };

/** Head categories with their sub-categories (only sub-categories can hold products). */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  await requireAdmin();
  const all = await db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId, active: categories.active })
    .from(categories)
    .orderBy(asc(categories.sort), asc(categories.name));
  return all
    .filter((c) => !c.parentId)
    .map((h) => ({
      id: h.id,
      name: h.name,
      active: h.active,
      children: all.filter((c) => c.parentId === h.id).map((c) => ({ id: c.id, name: c.name, active: c.active })),
    }));
}

/** Everything the editor's pickers need. `productId` keeps inactive finishes the product already uses. */
export async function getProductFormOptions(productId?: string) {
  await requireAdmin();
  const [cats, tagRows, finishRows, productRows] = await Promise.all([
    getCategoryOptions(),
    db.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)),
    db.query.finishes.findMany({
      columns: { id: true, name: true, active: true },
      orderBy: [asc(finishes.sort), asc(finishes.name)],
      with: {
        colourways: {
          columns: { id: true, name: true, active: true },
          orderBy: (c, { asc }) => [asc(c.sort)],
          with: {
            colours: {
              columns: {},
              with: { slot: { columns: { position: true } }, colour: { columns: { hex: true } } },
            },
          },
        },
      },
    }),
    listRelatedOptions(),
  ]);
  let usedFinishIds = new Set<string>();
  if (productId) {
    const used = await db
      .select({ finishId: productFinishes.finishId })
      .from(productFinishes)
      .where(eq(productFinishes.productId, productId));
    usedFinishIds = new Set(used.map((u) => u.finishId));
  }
  const finishOptions: FinishOption[] = finishRows
    .filter((f) => f.active || usedFinishIds.has(f.id))
    .map((f) => ({
      id: f.id,
      name: f.name,
      active: f.active,
      colourways: f.colourways.map((c) => ({
        id: c.id,
        name: c.name,
        active: c.active,
        hexes: [...c.colours].sort((a, b) => a.slot.position - b.slot.position).map((x) => x.colour.hex),
      })),
    }));
  return {
    categories: cats,
    tags: tagRows as TagOption[],
    finishes: finishOptions,
    products: productRows.filter((p) => p.id !== productId),
  };
}
export type ProductFormOptions = Awaited<ReturnType<typeof getProductFormOptions>>;

async function listRelatedOptions(): Promise<RelatedOption[]> {
  const rows = await db.query.products.findMany({
    columns: { id: true, name: true, slug: true, status: true },
    orderBy: [asc(products.name)],
    with: {
      finishes: {
        columns: { isDefault: true, active: true },
        with: {
          images: { columns: {}, orderBy: (i, { asc }) => [asc(i.sort)], limit: 1, with: { media: { columns: { r2Key: true } } } },
        },
      },
    },
  });
  return rows.map((p) => {
    const active = p.finishes.filter((f) => f.active);
    const def = active.find((f) => f.isDefault) ?? active[0];
    return { id: p.id, name: p.name, slug: p.slug, status: p.status, thumbKey: def?.images[0]?.media.r2Key ?? null };
  });
}

export type EditorImage = { mediaId: string; key: string; alt: string; colourwayId: string | null };

export type ProductEditorData = {
  id: string;
  updatedAt: string;
  values: ProductValues;
  /** Images per finish, including finishes currently unticked (so re-ticking restores them). */
  imagesByFinish: Record<string, EditorImage[]>;
  /** Whether a hard delete is allowed (draft with no cart or combo references). */
  references: { cartItems: number; comboItems: number };
};

/** The product as editor form values, plus image keys for display. Null when not found. */
export async function getProductEditor(id: string): Promise<ProductEditorData | null> {
  await requireAdmin();
  const p = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      tags: { columns: { tagId: true } },
      finishes: {
        orderBy: [asc(productFinishes.sort)],
        with: {
          images: {
            orderBy: (i, { asc }) => [asc(i.sort)],
            with: { media: { columns: { id: true, r2Key: true, alt: true } } },
          },
          variants: { orderBy: [asc(productVariants.setSize)] },
        },
      },
      related: { columns: { relatedProductId: true, sort: true } },
    },
  });
  if (!p) return null;

  const activeFinishes = p.finishes.filter((f) => f.active);
  // Set sizes come from the active variants of active finishes; fall back to [1].
  const sizes = new Set<number>();
  for (const f of activeFinishes) for (const v of f.variants) if (v.active) sizes.add(v.setSize);
  let setSizes = [...sizes].sort((a, b) => a - b);
  if (!p.soldInSets) setSizes = [1];
  else {
    setSizes = setSizes.filter((s) => s >= 2);
    if (setSizes.length === 0) setSizes = [2];
  }

  // Prices for every variant we know (inactive ones too), so re-adding a set size or re-ticking a
  // finish brings back the last prices typed.
  const prices: ProductValues["prices"] = {};
  for (const f of p.finishes)
    for (const v of f.variants) prices[priceKey(f.finishId, v.setSize)] = { price: v.price, costPrice: v.costPrice };

  const imagesByFinish: Record<string, EditorImage[]> = {};
  for (const f of p.finishes)
    imagesByFinish[f.finishId] = f.images.map((i) => ({
      mediaId: i.media.id,
      key: i.media.r2Key,
      alt: i.media.alt,
      colourwayId: i.colourwayId,
    }));

  const hasDefault = activeFinishes.some((f) => f.isDefault);
  const values: ProductValues = {
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    tagIds: p.tags.map((t) => t.tagId),
    blurb: p.blurb,
    description: p.description,
    sizeText: p.sizeText,
    cartLimit: p.cartLimit,
    soldInSets: p.soldInSets,
    comboEligible: p.comboEligible,
    status: p.status,
    featuredRank: p.featuredRank,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    finishes: activeFinishes.map((f, i) => ({
      finishId: f.finishId,
      isDefault: hasDefault ? f.isDefault : i === 0,
      images: f.images.map((img) => ({ mediaId: img.mediaId, colourwayId: img.colourwayId })),
    })),
    setSizes,
    prices,
    relatedIds: [...p.related].sort((a, b) => a.sort - b.sort).map((r) => r.relatedProductId),
  };

  return { id: p.id, updatedAt: p.updatedAt.toISOString(), values, imagesByFinish, references: await productReferences(id) };
}

/** How many cart lines and combo items point at this product (a hard delete needs both at zero). */
export async function productReferences(productId: string) {
  await requireAdmin();
  const [[c], [k]] = await Promise.all([
    db
      .select({ n: count() })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(productFinishes, eq(productFinishes.id, productVariants.productFinishId))
      .where(eq(productFinishes.productId, productId)),
    db.select({ n: count() }).from(comboItems).where(eq(comboItems.productId, productId)),
  ]);
  return { cartItems: c.n, comboItems: k.n };
}
