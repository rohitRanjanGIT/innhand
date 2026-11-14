// Cache tags for catalogue reads ('use cache' + cacheTag). Admin saves call updateTag(...) with the
// same names so the owner sees the change at once.
export const TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  nav: "nav",
  finishes: "finishes",
  combos: "combos",
  settings: "settings",
  /** Home page sections, reviews and Instagram tiles. */
  home: "home",
} as const;
