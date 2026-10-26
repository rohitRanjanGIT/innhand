export type Product = {
  slug: string;
  name: string;
  /** Shop group, shown under the name. */
  category: string;
  /** Slug of the category the product is listed under. */
  categorySlug: string;
  blurb: string;
  image: string;
  /** Price in rupees. Dummy figures until real prices are set. */
  price: number;
  /** Placeholder until real measurements are set. */
  size: string;
  href: string;
};

// Placeholder line-art images; swap `image` for real product photos (portrait, 3:4).
const catalogue: Omit<Product, "href">[] = [
  {
    slug: "flower-vases",
    name: "Flower Vases",
    category: "Home Décor",
    categorySlug: "vases",
    blurb: "A pair of sculptural vases, hand-poured in the colours you choose.",
    image: "/assets/cards/vases.svg",
    price: 1850,
    size: "[dimensions]",
  },
  {
    slug: "leaf-heart-tray",
    name: "Leaf Heart Tray",
    category: "Gifting",
    categorySlug: "trinket-trays",
    blurb: "A heart-shaped tray with a leaf imprint, for rings, keys and little keepsakes.",
    image: "/assets/cards/heart-tray.svg",
    price: 650,
    size: "[dimensions]",
  },
  {
    slug: "bubble-tray-tulip-candles",
    name: "Bubble Tray with Tulip Candles",
    category: "Gifting",
    categorySlug: "trinket-trays",
    blurb: "A bubble tray paired with tulip candles. A gift that is ready to glow.",
    image: "/assets/cards/tulip-tray.svg",
    price: 1250,
    size: "[dimensions]",
  },
  {
    slug: "coaster-set",
    name: "Coaster Set",
    category: "Home Décor",
    categorySlug: "coasters",
    blurb: "Speckled coasters for the table and the bar cart, poured in your colours.",
    image: "/assets/cards/coasters.svg",
    price: 1100,
    size: "[dimensions]",
  },
  {
    slug: "tealight-holders",
    name: "Tealight Holders",
    category: "Home Décor",
    categorySlug: "tealight-holders",
    blurb: "Little holders that bring a soft glow to a shelf, a desk or a festive table.",
    image: "/assets/cards/tealights.svg",
    price: 750,
    size: "[dimensions]",
  },
];

export const products: Product[] = catalogue.map((p) => ({ ...p, href: `/products/${p.slug}` }));

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

/** Rupees with Indian digit grouping, e.g. ₹1,25,000. Done by hand so server and browser always agree. */
export function formatPrice(rupees: number) {
  const digits = String(Math.round(rupees));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `₹${rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},` : ""}${last3}`;
}

/** Colours every piece can be poured in. */
export const colours = [
  { name: "Blush", hex: "#EBCFC8" },
  { name: "Sage", hex: "#DCDFD1" },
  { name: "Mist", hex: "#D3DAE0" },
  { name: "Sand", hex: "#E4C9B6" },
  { name: "Stone", hex: "#E1DAD3" },
  { name: "Ivory", hex: "#F7F2EC" },
  { name: "Plum", hex: "#32255D" },
];

export const finishes = ["Marble", "Terrazzo", "Speckled", "Matte"];

/** A shop category. Without an `image` its tile shows a tinted placeholder. */
export type Category = {
  slug: string;
  name: string;
  group: string;
  blurb: string;
  image?: string;
  bg: string;
  href: string;
};

const categoryList: Omit<Category, "href">[] = [
  {
    slug: "planters",
    name: "Planters",
    group: "Home Décor",
    blurb: "Small planters for succulents and cuttings, poured in your colours.",
    bg: "#DCDFD1",
  },
  {
    slug: "vases",
    name: "Vases",
    group: "Home Décor",
    blurb: "Sculptural vases for dried stems and fresh blooms.",
    image: "/assets/cards/vases.svg",
    bg: "#DCDFD1",
  },
  {
    slug: "tealight-holders",
    name: "Tealight holders",
    group: "Home Décor",
    blurb: "Holders that bring a soft glow to a shelf, a desk or a festive table.",
    image: "/assets/cards/tealights.svg",
    bg: "#E1DAD3",
  },
  {
    slug: "coasters",
    name: "Coasters",
    group: "Home Décor",
    blurb: "Speckled and marbled coasters for the table and the bar cart.",
    image: "/assets/cards/coasters.svg",
    bg: "#E4C9B6",
  },
  {
    slug: "trinket-trays",
    name: "Trinket trays",
    group: "Gifting",
    blurb: "Little trays for rings, keys and keepsakes. A gift that stays.",
    image: "/assets/cards/heart-tray.svg",
    bg: "#EBCFC8",
  },
  {
    slug: "jewellery-boxes",
    name: "Jewellery boxes",
    group: "Gifting",
    blurb: "Lidded boxes that keep jewellery safe, and look lovely doing it.",
    bg: "#D3DAE0",
  },
];

export const categories: Category[] = categoryList.map((c) => ({ ...c, href: `/shop/${c.slug}` }));

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);

export const productsIn = (slug: string) => products.filter((p) => p.categorySlug === slug);

/** Shop link for a menu label: its category page when one matches, otherwise the whole shop. */
export const shopHref = (label: string) =>
  categories.find((c) => c.name.toLowerCase() === label.toLowerCase())?.href ?? "/shop";
