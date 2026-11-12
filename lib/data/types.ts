// Shapes returned by the storefront reads in lib/data/*. Types only (no server-only import), so
// client components can import them too. None of these carry cost prices.

/** A product tile in a listing. `image` is a media key for next/image (see lib/images.ts). */
export type ProductTile = {
  id: string;
  slug: string;
  name: string;
  href: string;
  /** Head category name, shown above the name ("Home Décor"). */
  category: string;
  /** Sub-category id and slug. */
  categoryId: string | null;
  categorySlug: string | null;
  headCategoryId: string | null;
  tagIds: string[];
  image: string | null;
  /** Lowest active price (rule 7), null when every variant is priced on request. */
  price: number | null;
  from: boolean;
  featuredRank: number | null;
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  href: string;
  blurb: string;
  bgColour: string;
  image: string | null;
  /** Null for a head category. */
  parentId: string | null;
  /** Head category name for a sub-category, its own name for a head category. */
  group: string;
};

export type CategoryTree = (CategoryNode & { children: CategoryNode[] })[];

export type Occasion = { id: string; name: string; slug: string; href: string; blurb: string; image: string | null };

export type MenuLink = { label: string; href: string };
export type MenuGroup = { title: string; href: string; highlight: boolean; links: MenuLink[] };
export type MenuSection = { heading: string; mode: "categories" | "manual"; groups: MenuGroup[] };

export type Swatch = { slotLabel: string; name: string; hex: string };

export type ProductColourway = { id: string; name: string; swatches: Swatch[] };

export type ProductEffectSlot = {
  id: string;
  label: string;
  required: boolean;
  options: { id: string; name: string; extraPrice: number }[];
};

export type ProductVariant = { id: string; setSize: number; price: number | null };

export type ProductImage = { key: string; alt: string; colourwayId: string | null };

export type ProductFinishOption = {
  productFinishId: string;
  name: string;
  description: string;
  isDefault: boolean;
  images: ProductImage[];
  colourways: ProductColourway[];
  effectSlots: ProductEffectSlot[];
  /** Ordered by set size. */
  variants: ProductVariant[];
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  description: string;
  sizeText: string;
  soldInSets: boolean;
  /** The product's own cart limit; null means the store default applies. */
  cartLimit: number | null;
  seoTitle: string;
  seoDescription: string;
  /** Head category name ("Home Décor"), for the eyebrow. */
  group: string;
  category: { name: string; slug: string; href: string } | null;
  /** Ordered: the default finish first, then by sort. */
  finishes: ProductFinishOption[];
};
