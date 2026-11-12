"use server";
// Admin Server Actions for combos, the shopper-built switch and the 2/3/4-piece tiers.
// Every export is wrapped in adminAction (admin session + Zod).
import { updateTag } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  cartBundles,
  comboDiscountTiers,
  comboImages,
  comboItems,
  combos,
  media,
  productFinishes,
  productVariants,
  storeSettings,
} from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { slugify } from "@/lib/utils";
import { deleteOrphanMedia } from "./media-cleanup";
import { ActionError, adminAction } from "./action";

const discountSchema = {
  discountType: z.enum(["amount", "percent"]),
  discountValue: z.number().int("Whole rupees or whole percent").min(0, "Can't be negative"),
};

function checkPercent(d: { discountType: "amount" | "percent"; discountValue: number }, ctx: z.RefinementCtx) {
  if (d.discountType === "percent" && d.discountValue > 100) {
    ctx.addIssue({ code: "custom", message: "A percentage can't be more than 100", path: ["discountValue"] });
  }
}

const comboSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Give the combo a name").max(120),
    slug: z.string().trim().max(120).default(""),
    description: z.string().trim().max(4000).default(""),
    status: z.enum(["draft", "active", "archived"]),
    sort: z.number().int().default(0),
    ...discountSchema,
    items: z
      .array(
        z.object({
          productId: z.uuid(),
          productFinishId: z.uuid({ message: "Pick a finish for every piece" }),
          setSize: z.number().int().min(1),
        }),
      )
      .min(2, "A combo needs 2 to 4 pieces")
      .max(4, "A combo needs 2 to 4 pieces"),
    /** media ids, in display order */
    imageIds: z.array(z.uuid()).max(20).default([]),
  })
  .superRefine(checkPercent);

export const saveCombo = adminAction(comboSchema, async (input) => {
  const slug = slugify(input.slug || input.name);
  if (!slug) throw new ActionError("The slug needs at least one letter or number.");

  // Each piece's finish must belong to its product, and that finish must have the chosen set size.
  const pfIds = input.items.map((i) => i.productFinishId);
  const pfRows = await db
    .select({ id: productFinishes.id, productId: productFinishes.productId })
    .from(productFinishes)
    .where(inArray(productFinishes.id, pfIds));
  const variantRows = await db
    .select({ productFinishId: productVariants.productFinishId, setSize: productVariants.setSize })
    .from(productVariants)
    .where(inArray(productVariants.productFinishId, pfIds));
  for (const [n, it] of input.items.entries()) {
    const pf = pfRows.find((r) => r.id === it.productFinishId);
    if (!pf || pf.productId !== it.productId) throw new ActionError(`Piece ${n + 1}: that finish isn't on this product.`);
    if (!variantRows.some((v) => v.productFinishId === it.productFinishId && v.setSize === it.setSize))
      throw new ActionError(`Piece ${n + 1}: there's no ${it.setSize}-piece set in that finish.`);
  }
  const imageIds = [...new Set(input.imageIds)];
  if (imageIds.length) {
    const found = await db.select({ id: media.id }).from(media).where(inArray(media.id, imageIds));
    if (found.length !== imageIds.length) throw new ActionError("One of the photos no longer exists. Upload it again.");
  }

  const values = {
    name: input.name,
    slug,
    description: input.description,
    status: input.status,
    sort: input.sort,
    discountType: input.discountType,
    discountValue: input.discountValue,
  };

  const { id, removedImages } = await db.transaction(async (tx) => {
    let id = input.id;
    let removedImages: string[] = [];
    if (id) {
      const [updated] = await tx.update(combos).set(values).where(eq(combos.id, id)).returning({ id: combos.id });
      if (!updated) throw new ActionError("This combo no longer exists.");
      const before = await tx.select({ mediaId: comboImages.mediaId }).from(comboImages).where(eq(comboImages.comboId, id));
      removedImages = before.map((b) => b.mediaId).filter((m) => !imageIds.includes(m));
      await tx.delete(comboItems).where(eq(comboItems.comboId, id));
      await tx.delete(comboImages).where(eq(comboImages.comboId, id));
    } else {
      const [created] = await tx.insert(combos).values(values).returning({ id: combos.id });
      id = created.id;
    }
    await tx.insert(comboItems).values(
      input.items.map((it, sort) => ({
        comboId: id!,
        productId: it.productId,
        defaultProductFinishId: it.productFinishId,
        defaultSetSize: it.setSize,
        sort,
      })),
    );
    if (imageIds.length) {
      await tx.insert(comboImages).values(imageIds.map((mediaId, sort) => ({ comboId: id!, mediaId, sort })));
    }
    return { id: id!, removedImages };
  });

  await deleteOrphanMedia(removedImages);
  updateTag(TAGS.combos);
  return { id, slug };
});

export const setComboStatus = adminAction(
  z.object({ id: z.uuid(), status: z.enum(["draft", "active", "archived"]) }),
  async ({ id, status }) => {
    await db.update(combos).set({ status }).where(eq(combos.id, id));
    updateTag(TAGS.combos);
  },
);

/** Deletes a combo that no cart points at; otherwise asks the owner to archive it instead. */
export const deleteCombo = adminAction(z.object({ id: z.uuid() }), async ({ id }) => {
  const inCarts = await db.select({ id: cartBundles.id }).from(cartBundles).where(eq(cartBundles.comboId, id)).limit(1);
  if (inCarts.length) throw new ActionError("Shoppers have this combo in their carts. Archive it instead.");
  const images = await db.select({ mediaId: comboImages.mediaId }).from(comboImages).where(eq(comboImages.comboId, id));
  await db.transaction(async (tx) => {
    await tx.delete(combos).where(eq(combos.id, id)); // items and images cascade
  });
  await deleteOrphanMedia(images.map((i) => i.mediaId));
  updateTag(TAGS.combos);
});

const tiersSchema = z.object({
  tiers: z
    .array(z.object({ itemCount: z.union([z.literal(2), z.literal(3), z.literal(4)]), ...discountSchema }).superRefine(checkPercent))
    .length(3)
    .refine((t) => new Set(t.map((x) => x.itemCount)).size === 3, "Give one discount each for 2, 3 and 4 pieces"),
});

export const saveComboTiers = adminAction(tiersSchema, async ({ tiers }) => {
  await db.transaction(async (tx) => {
    for (const t of tiers) {
      await tx
        .insert(comboDiscountTiers)
        .values(t)
        .onConflictDoUpdate({
          target: comboDiscountTiers.itemCount,
          set: { discountType: t.discountType, discountValue: t.discountValue },
        });
    }
  });
  updateTag(TAGS.combos);
});

export const setCustomCombosEnabled = adminAction(z.object({ enabled: z.boolean() }), async ({ enabled }) => {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(storeSettings)
      .set({ customCombosEnabled: enabled })
      .where(eq(storeSettings.id, 1))
      .returning({ id: storeSettings.id });
    if (!updated.length) await tx.insert(storeSettings).values({ id: 1, customCombosEnabled: enabled });
  });
  updateTag(TAGS.settings);
  updateTag(TAGS.combos);
});
