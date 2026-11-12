import "server-only";
// Storefront reads for combos. Named columns only (never cost_price). Cached with the combos,
// products and finishes tags; the *Uncached functions are the real reads (and are what tests call).
import { cacheTag } from "next/cache";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  colours,
  colourwayColours,
  colourways,
  comboDiscountTiers,
  comboImages,
  comboItems,
  combos,
  finishColourSlots,
  finishEffectOptions,
  finishEffectSlots,
  finishes,
  media,
  productFinishImages,
  productFinishes,
  products,
  productVariants,
} from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import type { Discount } from "@/lib/pricing";
import { listingPrice } from "@/lib/pricing";
import {
  defaultChoice,
  pieceImage,
  priceBundle,
  type PieceChoice,
  type PieceFinish,
  type PieceProduct,
} from "@/components/combos/model";

// ---------------------------------------------------------------------------------------------
// Piece options: products → their active finishes → colourways, effects and priced variants.
// ---------------------------------------------------------------------------------------------

type LoadedPiece = PieceProduct & { status: string; comboEligible: boolean };

/** The option model for these products (same shape the product page uses). Unordered map by id. */
export async function loadPieceOptions(productIds: string[]): Promise<Map<string, LoadedPiece>> {
  const out = new Map<string, LoadedPiece>();
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return out;

  const [prodRows, pfRows] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        sizeText: products.sizeText,
        soldInSets: products.soldInSets,
        status: products.status,
        comboEligible: products.comboEligible,
        category: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(inArray(products.id, ids)),
    db
      .select({
        id: productFinishes.id,
        productId: productFinishes.productId,
        isDefault: productFinishes.isDefault,
        finishId: finishes.id,
        name: finishes.name,
      })
      .from(productFinishes)
      .innerJoin(finishes, eq(finishes.id, productFinishes.finishId))
      .where(and(inArray(productFinishes.productId, ids), eq(productFinishes.active, true), eq(finishes.active, true)))
      .orderBy(asc(productFinishes.sort), asc(finishes.sort)),
  ]);

  const pfIds = pfRows.map((r) => r.id);
  const finishIds = [...new Set(pfRows.map((r) => r.finishId))];
  if (pfIds.length === 0) {
    for (const p of prodRows) out.set(p.id, { ...p, productId: p.id, category: p.category ?? "", finishes: [] });
    return out;
  }

  const [variantRows, imageRows, slotRows, cwRows, cwColourRows, effectSlotRows, optionRows] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        productFinishId: productVariants.productFinishId,
        setSize: productVariants.setSize,
        price: productVariants.price,
      })
      .from(productVariants)
      .where(
        and(
          inArray(productVariants.productFinishId, pfIds),
          eq(productVariants.active, true),
          isNotNull(productVariants.price),
        ),
      )
      .orderBy(asc(productVariants.setSize)),
    db
      .select({
        productFinishId: productFinishImages.productFinishId,
        key: media.r2Key,
        alt: media.alt,
        colourwayId: productFinishImages.colourwayId,
      })
      .from(productFinishImages)
      .innerJoin(media, eq(media.id, productFinishImages.mediaId))
      .where(inArray(productFinishImages.productFinishId, pfIds))
      .orderBy(asc(productFinishImages.sort)),
    db
      .select({ id: finishColourSlots.id, position: finishColourSlots.position, label: finishColourSlots.label })
      .from(finishColourSlots)
      .where(inArray(finishColourSlots.finishId, finishIds)),
    db
      .select({ id: colourways.id, finishId: colourways.finishId, name: colourways.name })
      .from(colourways)
      .where(and(inArray(colourways.finishId, finishIds), eq(colourways.active, true)))
      .orderBy(asc(colourways.sort), asc(colourways.name)),
    db
      .select({
        colourwayId: colourwayColours.colourwayId,
        slotId: colourwayColours.slotId,
        hex: colours.hex,
        colourName: colours.name,
      })
      .from(colourwayColours)
      .innerJoin(colourways, eq(colourways.id, colourwayColours.colourwayId))
      .innerJoin(colours, eq(colours.id, colourwayColours.colourId))
      .where(inArray(colourways.finishId, finishIds)),
    db
      .select({
        id: finishEffectSlots.id,
        finishId: finishEffectSlots.finishId,
        label: finishEffectSlots.label,
        required: finishEffectSlots.required,
      })
      .from(finishEffectSlots)
      .where(inArray(finishEffectSlots.finishId, finishIds))
      .orderBy(asc(finishEffectSlots.position)),
    db
      .select({
        id: finishEffectOptions.id,
        slotId: finishEffectOptions.slotId,
        name: finishEffectOptions.name,
        extraPrice: finishEffectOptions.extraPrice,
      })
      .from(finishEffectOptions)
      .innerJoin(finishEffectSlots, eq(finishEffectSlots.id, finishEffectOptions.slotId))
      .where(and(inArray(finishEffectSlots.finishId, finishIds), eq(finishEffectOptions.active, true)))
      .orderBy(asc(finishEffectOptions.sort), asc(finishEffectOptions.name)),
  ]);

  const slotById = new Map(slotRows.map((s) => [s.id, s]));
  const swatchesByCw = new Map<string, { position: number; slotLabel: string; colourName: string; hex: string }[]>();
  for (const c of cwColourRows) {
    const slot = slotById.get(c.slotId);
    const list = swatchesByCw.get(c.colourwayId) ?? [];
    list.push({ position: slot?.position ?? 0, slotLabel: slot?.label ?? "", colourName: c.colourName, hex: c.hex });
    swatchesByCw.set(c.colourwayId, list);
  }

  const finishCache = new Map<string, Pick<PieceFinish, "colourways" | "effectSlots">>();
  const finishParts = (finishId: string) => {
    let parts = finishCache.get(finishId);
    if (!parts) {
      parts = {
        colourways: cwRows
          .filter((c) => c.finishId === finishId)
          .map((c) => ({
            id: c.id,
            name: c.name,
            swatches: (swatchesByCw.get(c.id) ?? [])
              .sort((a, b) => a.position - b.position)
              .map(({ slotLabel, colourName, hex }) => ({ slotLabel, colourName, hex })),
          })),
        effectSlots: effectSlotRows
          .filter((s) => s.finishId === finishId)
          .map((s) => ({
            id: s.id,
            label: s.label,
            required: s.required,
            options: optionRows
              .filter((o) => o.slotId === s.id)
              .map((o) => ({ id: o.id, name: o.name, extraPrice: o.extraPrice })),
          }))
          .filter((s) => s.options.length > 0),
      };
      finishCache.set(finishId, parts);
    }
    return parts;
  };

  for (const p of prodRows) {
    const pieceFinishes: PieceFinish[] = pfRows
      .filter((pf) => pf.productId === p.id)
      .map((pf) => ({
        productFinishId: pf.id,
        name: pf.name,
        isDefault: pf.isDefault,
        images: imageRows
          .filter((i) => i.productFinishId === pf.id)
          .map((i) => ({ key: i.key, alt: i.alt, colourwayId: i.colourwayId })),
        ...finishParts(pf.finishId),
        variants: variantRows
          .filter((v) => v.productFinishId === pf.id)
          .map((v) => ({ id: v.id, setSize: v.setSize, price: v.price! })),
      }))
      // A finish with no priced variant can't go in a bundle.
      .filter((f) => f.variants.length > 0);
    out.set(p.id, {
      productId: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category ?? "",
      sizeText: p.sizeText,
      soldInSets: p.soldInSets,
      status: p.status,
      comboEligible: p.comboEligible,
      finishes: pieceFinishes,
    });
  }
  return out;
}

function strip({ status: _s, comboEligible: _c, ...piece }: LoadedPiece): PieceProduct {
  return piece;
}

// ---------------------------------------------------------------------------------------------
// Admin combos on the storefront
// ---------------------------------------------------------------------------------------------

export type ComboPiece = {
  product: PieceProduct;
  /** The admin's default finish and set size, with the default colourway and effects. */
  choice: PieceChoice;
};

export type StoreCombo = {
  id: string;
  slug: string;
  name: string;
  description: string;
  discount: Discount;
  images: { key: string; alt: string }[];
  pieces: ComboPiece[];
  /** At the default finishes. */
  piecesTotal: number;
  saving: number;
  total: number;
  /** Lowest total across finishes (at the default set sizes), for "From". */
  fromTotal: number;
};

type ComboRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  discountType: "amount" | "percent";
  discountValue: number;
};

/**
 * Builds the storefront view of combos, dropping any combo that must hide itself: a product that is
 * not active, or a default finish/set size with no active priced variant, or not 2–4 pieces.
 */
async function buildStoreCombos(rows: ComboRow[]): Promise<StoreCombo[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [itemRows, imageRows] = await Promise.all([
    db
      .select({
        comboId: comboItems.comboId,
        productId: comboItems.productId,
        productFinishId: comboItems.defaultProductFinishId,
        setSize: comboItems.defaultSetSize,
      })
      .from(comboItems)
      .where(inArray(comboItems.comboId, ids))
      .orderBy(asc(comboItems.sort), asc(comboItems.createdAt)),
    db
      .select({ comboId: comboImages.comboId, key: media.r2Key, alt: media.alt })
      .from(comboImages)
      .innerJoin(media, eq(media.id, comboImages.mediaId))
      .where(inArray(comboImages.comboId, ids))
      .orderBy(asc(comboImages.sort)),
  ]);
  const pieces = await loadPieceOptions(itemRows.map((i) => i.productId));

  const result: StoreCombo[] = [];
  for (const row of rows) {
    const items = itemRows.filter((i) => i.comboId === row.id);
    if (items.length < 2 || items.length > 4) continue;
    const comboPieces: ComboPiece[] = [];
    let ok = true;
    for (const it of items) {
      const p = pieces.get(it.productId);
      const f = p?.finishes.find((x) => x.productFinishId === it.productFinishId);
      if (!p || p.status !== "active" || !f || !f.variants.some((v) => v.setSize === it.setSize)) {
        ok = false;
        break;
      }
      comboPieces.push({ product: strip(p), choice: defaultChoice(p, it.productFinishId, it.setSize)! });
    }
    if (!ok) continue;

    const discount: Discount = { type: row.discountType, value: row.discountValue };
    const priced = priceBundle(comboPieces, discount);
    if (!priced) continue;

    // "From": each piece in its cheapest finish at the default set size (falling back to the default).
    const cheapest = comboPieces.map(({ product, choice }) => {
      const options = product.finishes
        .filter((f) => f.variants.some((v) => v.setSize === choice.setSize))
        .map((f) => defaultChoice(product, f.productFinishId, choice.setSize)!);
      return { product, options: options.length ? options : [choice] };
    });
    const fromPieces = cheapest.map(({ product, options }) => {
      let best = options[0];
      let bestTotal = Infinity;
      for (const o of options) {
        const t = priceBundle([{ product, choice: o }], null)?.total ?? Infinity;
        if (t < bestTotal) [best, bestTotal] = [o, t];
      }
      return { product, choice: best };
    });
    const from = priceBundle(fromPieces, discount);

    result.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      discount,
      images: imageRows.filter((i) => i.comboId === row.id).map(({ key, alt }) => ({ key, alt })),
      pieces: comboPieces,
      piecesTotal: priced.piecesTotal,
      saving: priced.saving,
      total: priced.total,
      fromTotal: Math.min(from?.total ?? priced.total, priced.total),
    });
  }
  return result;
}

const comboColumns = {
  id: combos.id,
  slug: combos.slug,
  name: combos.name,
  description: combos.description,
  discountType: combos.discountType,
  discountValue: combos.discountValue,
};

export async function listActiveCombosUncached() {
  const rows = await db
    .select(comboColumns)
    .from(combos)
    .where(eq(combos.status, "active"))
    .orderBy(asc(combos.sort), asc(combos.name));
  return buildStoreCombos(rows);
}

export async function getComboBySlugUncached(slug: string) {
  const rows = await db
    .select(comboColumns)
    .from(combos)
    .where(and(eq(combos.slug, slug), eq(combos.status, "active")))
    .limit(1);
  return (await buildStoreCombos(rows))[0] ?? null;
}

/** Active combos the storefront may show, in the admin's order. */
export async function listActiveCombos() {
  "use cache";
  cacheTag(TAGS.combos, TAGS.products, TAGS.finishes);
  return listActiveCombosUncached();
}

/** One active, showable combo, or null. */
export async function getComboBySlug(slug: string) {
  "use cache";
  cacheTag(TAGS.combos, TAGS.products, TAGS.finishes);
  return getComboBySlugUncached(slug);
}

// ---------------------------------------------------------------------------------------------
// Shopper-built combos
// ---------------------------------------------------------------------------------------------

export type BuildProduct = PieceProduct & {
  image: { key: string; alt: string } | null;
  /** Lowest price across its finishes and set sizes, for the tile. */
  price: { price: number | null; from: boolean };
};

export type ComboTier = { itemCount: number; discount: Discount };

export async function listBuildProductsUncached(): Promise<BuildProduct[]> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.status, "active"), eq(products.comboEligible, true)))
    .orderBy(asc(products.featuredRank), asc(products.name));
  const pieces = await loadPieceOptions(rows.map((r) => r.id));
  const out: BuildProduct[] = [];
  for (const r of rows) {
    const p = pieces.get(r.id);
    if (!p || p.finishes.length === 0) continue;
    const choice = defaultChoice(p)!;
    const img = pieceImage(p, choice);
    out.push({
      ...strip(p),
      image: img ? { key: img.key, alt: img.alt } : null,
      price: listingPrice(p.finishes.flatMap((f) => f.variants.map((v) => v.price))),
    });
  }
  return out;
}

export async function listComboTiersUncached(): Promise<ComboTier[]> {
  const rows = await db
    .select({
      itemCount: comboDiscountTiers.itemCount,
      discountType: comboDiscountTiers.discountType,
      discountValue: comboDiscountTiers.discountValue,
    })
    .from(comboDiscountTiers)
    .orderBy(asc(comboDiscountTiers.itemCount));
  return rows.map((r) => ({ itemCount: r.itemCount, discount: { type: r.discountType, value: r.discountValue } }));
}

/** Active, combo-eligible products with at least one priced finish. */
export async function listBuildProducts() {
  "use cache";
  cacheTag(TAGS.combos, TAGS.products, TAGS.finishes);
  return listBuildProductsUncached();
}

/** The 2, 3 and 4 piece discounts for shopper-built combos. */
export async function listComboTiers() {
  "use cache";
  cacheTag(TAGS.combos);
  return listComboTiersUncached();
}
