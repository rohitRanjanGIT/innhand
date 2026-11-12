// One schema for the admin product editor, shared by the form (zodResolver) and the Server Action.
// Money is whole rupees. Prices are a map keyed by `${finishId}:${setSize}` so the grid survives
// ticking/unticking finishes and adding/removing set sizes without reindexing.
import { z } from "zod";

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const rupees = z.number().int("Whole rupees only").min(0, "Can't be negative").max(10_000_000).nullable();

export const priceKey = (finishId: string, setSize: number) => `${finishId}:${setSize}`;

export const productFinishInput = z.object({
  finishId: z.uuid(),
  isDefault: z.boolean(),
  images: z
    .array(
      z.object({
        mediaId: z.uuid(),
        /** Optional: picking this colourway shows this photo. Must be one of the finish's colourways. */
        colourwayId: z.uuid().nullable(),
      }),
    )
    .max(40, "At most 40 photos per finish"),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .max(200)
      .regex(SLUG_RE, "Lowercase letters, numbers and single hyphens only"),
    /** The sub-category (a category with a parent). */
    categoryId: z.uuid({ message: "Pick a sub-category" }).nullable(),
    tagIds: z.array(z.uuid()).max(50),
    blurb: z.string().trim().max(500),
    description: z.string().trim().max(10_000),
    sizeText: z.string().trim().max(500),
    /** Null = the store default from settings. */
    cartLimit: z.number().int("Whole number").min(1, "At least 1").max(999).nullable(),
    soldInSets: z.boolean(),
    comboEligible: z.boolean(),
    status: z.enum(PRODUCT_STATUSES),
    /** Null = not featured; lower shows first. */
    featuredRank: z.number().int("Whole number").min(1, "At least 1").max(999).nullable(),
    seoTitle: z.string().trim().max(120, "Keep it under 120 characters"),
    seoDescription: z.string().trim().max(320, "Keep it under 320 characters"),

    /** In display order; sort = index. */
    finishes: z.array(productFinishInput).max(50),
    /** Set sizes that apply across all finishes. [1] when not sold in sets. */
    setSizes: z.array(z.number().int().min(1, "At least 1").max(100)).min(1).max(20),
    prices: z.record(z.string(), z.object({ price: rupees, costPrice: rupees })),
    /** Hand-picked similar products, in order. */
    relatedIds: z.array(z.uuid()).max(24),
  })
  .superRefine((p, ctx) => {
    const finishIds = p.finishes.map((f) => f.finishId);
    if (new Set(finishIds).size !== finishIds.length) {
      ctx.addIssue({ code: "custom", path: ["finishes"], message: "A finish is listed twice" });
    }
    if (p.finishes.length > 0 && p.finishes.filter((f) => f.isDefault).length !== 1) {
      ctx.addIssue({ code: "custom", path: ["finishes"], message: "Pick exactly one default finish" });
    }
    if (new Set(p.setSizes).size !== p.setSizes.length) {
      ctx.addIssue({ code: "custom", path: ["setSizes"], message: "A set size is listed twice" });
    }
    if (!p.soldInSets && (p.setSizes.length !== 1 || p.setSizes[0] !== 1)) {
      ctx.addIssue({ code: "custom", path: ["setSizes"], message: "Products not sold in sets have set size 1 only" });
    }
    if (p.soldInSets && p.setSizes.some((s) => s < 2)) {
      ctx.addIssue({ code: "custom", path: ["setSizes"], message: "Set sizes start at 2" });
    }
    if (new Set(p.tagIds).size !== p.tagIds.length) {
      ctx.addIssue({ code: "custom", path: ["tagIds"], message: "A tag is listed twice" });
    }
    if (new Set(p.relatedIds).size !== p.relatedIds.length) {
      ctx.addIssue({ code: "custom", path: ["relatedIds"], message: "A similar product is listed twice" });
    }
    if (p.status === "active") {
      if (!p.categoryId) ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Active products need a sub-category" });
      if (p.finishes.length === 0)
        ctx.addIssue({ code: "custom", path: ["finishes"], message: "Active products need at least one finish" });
    }
    // Selling below cost is shown as a warning in the grid, not refused: it's the owner's call.
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductValues = z.output<typeof productSchema>;

export const saveProductSchema = z.object({
  id: z.uuid(),
  values: productSchema,
  /** Photos uploaded in this editing session that are no longer used; deleted if nothing references them. */
  discardedMediaIds: z.array(z.uuid()).max(500).default([]),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(200)
    .regex(SLUG_RE, "Lowercase letters, numbers and single hyphens only"),
  categoryId: z.uuid({ message: "Pick a sub-category" }).nullable(),
});
export type CreateProductInput = z.input<typeof createProductSchema>;

/** Margin for one price cell: null when either side is missing. */
export function margin(price: number | null, cost: number | null) {
  if (price === null || cost === null) return null;
  const amount = price - cost;
  return { amount, percent: price > 0 ? Math.round((amount / price) * 1000) / 10 : null };
}
