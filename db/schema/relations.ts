import { relations } from "drizzle-orm";
import { account, session, user } from "./auth";
import {
  colourways,
  colourwayColours,
  colours,
  finishColourSlots,
  effectCombinationEffects,
  effectCombinations,
  effects,
  finishEffectSlots,
  finishes,
} from "./finishes";
import {
  categories,
  media,
  productFinishImages,
  productFinishes,
  productRelated,
  products,
  productTags,
  productVariants,
  tags,
} from "./catalogue";
import { navGroups, navLinks, navSections } from "./nav";
import { comboImages, comboItems, combos } from "./combos";
import { addresses, cartBundles, cartItems, carts, wishlistItems } from "./cart";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  addresses: many(addresses),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const finishRelations = relations(finishes, ({ many }) => ({
  colourSlots: many(finishColourSlots),
  effectSlots: many(finishEffectSlots),
  effectCombinations: many(effectCombinations),
  colourways: many(colourways),
}));
export const finishColourSlotRelations = relations(finishColourSlots, ({ one }) => ({
  finish: one(finishes, { fields: [finishColourSlots.finishId], references: [finishes.id] }),
}));
export const effectRelations = relations(effects, ({ one }) => ({
  image: one(media, { fields: [effects.imageId], references: [media.id] }),
}));
export const finishEffectSlotRelations = relations(finishEffectSlots, ({ one }) => ({
  finish: one(finishes, { fields: [finishEffectSlots.finishId], references: [finishes.id] }),
}));
export const effectCombinationRelations = relations(effectCombinations, ({ one, many }) => ({
  finish: one(finishes, { fields: [effectCombinations.finishId], references: [finishes.id] }),
  effects: many(effectCombinationEffects),
}));
export const effectCombinationEffectRelations = relations(effectCombinationEffects, ({ one }) => ({
  combination: one(effectCombinations, {
    fields: [effectCombinationEffects.combinationId],
    references: [effectCombinations.id],
  }),
  slot: one(finishEffectSlots, { fields: [effectCombinationEffects.slotId], references: [finishEffectSlots.id] }),
  effect: one(effects, { fields: [effectCombinationEffects.effectId], references: [effects.id] }),
}));
export const colourwayRelations = relations(colourways, ({ one, many }) => ({
  finish: one(finishes, { fields: [colourways.finishId], references: [finishes.id] }),
  colours: many(colourwayColours),
}));
export const colourwayColourRelations = relations(colourwayColours, ({ one }) => ({
  colourway: one(colourways, { fields: [colourwayColours.colourwayId], references: [colourways.id] }),
  slot: one(finishColourSlots, { fields: [colourwayColours.slotId], references: [finishColourSlots.id] }),
  colour: one(colours, { fields: [colourwayColours.colourId], references: [colours.id] }),
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "tree" }),
  children: many(categories, { relationName: "tree" }),
  image: one(media, { fields: [categories.imageId], references: [media.id] }),
  products: many(products),
}));
export const tagRelations = relations(tags, ({ one, many }) => ({
  image: one(media, { fields: [tags.imageId], references: [media.id] }),
  products: many(productTags),
}));
export const productRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  tags: many(productTags),
  finishes: many(productFinishes),
  related: many(productRelated, { relationName: "related_from" }),
}));
export const productTagRelations = relations(productTags, ({ one }) => ({
  product: one(products, { fields: [productTags.productId], references: [products.id] }),
  tag: one(tags, { fields: [productTags.tagId], references: [tags.id] }),
}));
export const productFinishRelations = relations(productFinishes, ({ one, many }) => ({
  product: one(products, { fields: [productFinishes.productId], references: [products.id] }),
  finish: one(finishes, { fields: [productFinishes.finishId], references: [finishes.id] }),
  images: many(productFinishImages),
  variants: many(productVariants),
}));
export const productFinishImageRelations = relations(productFinishImages, ({ one }) => ({
  productFinish: one(productFinishes, {
    fields: [productFinishImages.productFinishId],
    references: [productFinishes.id],
  }),
  media: one(media, { fields: [productFinishImages.mediaId], references: [media.id] }),
  colourway: one(colourways, { fields: [productFinishImages.colourwayId], references: [colourways.id] }),
}));
export const productVariantRelations = relations(productVariants, ({ one }) => ({
  productFinish: one(productFinishes, {
    fields: [productVariants.productFinishId],
    references: [productFinishes.id],
  }),
}));
export const productRelatedRelations = relations(productRelated, ({ one }) => ({
  product: one(products, {
    fields: [productRelated.productId],
    references: [products.id],
    relationName: "related_from",
  }),
  related: one(products, { fields: [productRelated.relatedProductId], references: [products.id] }),
}));

export const navSectionRelations = relations(navSections, ({ many }) => ({
  groups: many(navGroups),
}));
export const navGroupRelations = relations(navGroups, ({ one, many }) => ({
  section: one(navSections, { fields: [navGroups.sectionId], references: [navSections.id] }),
  links: many(navLinks),
}));
export const navLinkRelations = relations(navLinks, ({ one }) => ({
  group: one(navGroups, { fields: [navLinks.groupId], references: [navGroups.id] }),
}));

export const comboRelations = relations(combos, ({ many }) => ({
  items: many(comboItems),
  images: many(comboImages),
}));
export const comboItemRelations = relations(comboItems, ({ one }) => ({
  combo: one(combos, { fields: [comboItems.comboId], references: [combos.id] }),
  product: one(products, { fields: [comboItems.productId], references: [products.id] }),
  defaultProductFinish: one(productFinishes, {
    fields: [comboItems.defaultProductFinishId],
    references: [productFinishes.id],
  }),
}));
export const comboImageRelations = relations(comboImages, ({ one }) => ({
  combo: one(combos, { fields: [comboImages.comboId], references: [combos.id] }),
  media: one(media, { fields: [comboImages.mediaId], references: [media.id] }),
}));

export const addressRelations = relations(addresses, ({ one }) => ({
  user: one(user, { fields: [addresses.userId], references: [user.id] }),
}));
export const cartRelations = relations(carts, ({ many }) => ({
  bundles: many(cartBundles),
  items: many(cartItems),
}));
export const cartBundleRelations = relations(cartBundles, ({ one, many }) => ({
  cart: one(carts, { fields: [cartBundles.cartId], references: [carts.id] }),
  combo: one(combos, { fields: [cartBundles.comboId], references: [combos.id] }),
  items: many(cartItems),
}));
export const cartItemRelations = relations(cartItems, ({ one, many }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  bundle: one(cartBundles, { fields: [cartItems.bundleId], references: [cartBundles.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
  colourway: one(colourways, { fields: [cartItems.colourwayId], references: [colourways.id] }),
  effectCombination: one(effectCombinations, {
    fields: [cartItems.effectCombinationId],
    references: [effectCombinations.id],
  }),
}));
export const wishlistRelations = relations(wishlistItems, ({ one }) => ({
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));
