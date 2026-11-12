// What the cart page receives (prices worked out on the server at read time). Types only.

export type CartLineView = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  href: string;
  /** Head category name. */
  category: string;
  image: string | null;
  finish: string;
  setSize: number;
  soldInSets: boolean;
  colourway: { name: string; swatches: { name: string; hex: string }[] } | null;
  effects: { slot: string; option: string }[];
  qty: number;
  /** Null when priced on request or no longer available. */
  unitPrice: number | null;
  lineTotal: number | null;
  /** False when the product, finish, variant, colourway or an effect has been withdrawn. */
  available: boolean;
  /** Highest qty this line can go to without passing the product's cart limit. */
  maxQty: number;
};

export type CartBundleView = {
  id: string;
  kind: "combo" | "custom";
  name: string;
  href: string | null;
  qty: number;
  maxQty: number;
  lines: CartLineView[];
  /** For one bundle × qty. */
  piecesTotal: number;
  saving: number;
  total: number;
  priced: boolean;
  /** Rule 9 and availability notices. */
  notice: string | null;
};

export type CartView = {
  lines: CartLineView[];
  bundles: CartBundleView[];
  count: number;
  subtotal: number;
  savings: number;
  shipping: number;
  total: number;
  freeShippingFrom: number;
  /** Loose lines that can't be totalled (priced on request). */
  quoteLines: number;
};
