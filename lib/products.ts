export type Product = {
  slug: string;
  name: string;
  /** Shop group, shown under the name. */
  category: string;
  /** Slug of the category the product is listed under. */
  categorySlug: string;
  blurb: string;
  image: string;
  /** Shots for the product gallery, main image first. Omit when there is a single photo. */
  gallery?: string[];
  /** Price in rupees, or null when the piece is priced on request. */
  price: number | null;
  /** Show the price as "From ₹…" (coaster sets, where it is the price of the smallest set). */
  priceFrom?: boolean;
  /** Dimensions, or a placeholder until real measurements are set. */
  size: string;
  href: string;
};

const DIMENSIONS_TBC = "[dimensions]";
const img = (name: string) => `/assets/products/${name}.jpg`;

// Prices, sizes and names come from the 2026 catalogue. Main images are the catalogue cut-outs on a
// cream ground (portrait, 3:4); the numbered extras (-2, -3) are lifestyle photos for the gallery.
const catalogue: Omit<Product, "href">[] = [
  // Planters
  {
    slug: "ribbed-round-pot",
    name: "Ribbed Round Pot",
    category: "Home Décor",
    categorySlug: "planters",
    blurb: "A ribbed round pot for succulents, pens and the odds and ends of a desk.",
    image: img("ribbed-round-pot"),
    price: 600,
    size: "8.7 × 6.6 cm",
  },
  {
    slug: "succulent-planter-candle-holder",
    name: "Succulent Planter & Candle Holder",
    category: "Home Décor",
    categorySlug: "planters",
    blurb: "Two little bowls in one: plant a succulent in one and set a tealight in the other.",
    image: img("succulent-planter-candle-holder"),
    price: 400,
    size: "18.1 × 8.8 × 3.7 cm",
  },
  {
    slug: "prism-pot",
    name: "Prism Pot",
    category: "Home Décor",
    categorySlug: "planters",
    blurb: "A faceted pot swirled in two colours, made for succulents and small plants.",
    image: img("prism-pot"),
    gallery: [img("prism-pot"), img("prism-pot-2")],
    price: 450,
    size: DIMENSIONS_TBC,
  },
  {
    slug: "rectangular-tube-planter",
    name: "Rectangular Tube Planter",
    category: "Home Décor",
    categorySlug: "planters",
    blurb: "A hand-poured frame that holds a glass test tube, so cuttings can root in water. Glass tube included.",
    image: img("rectangular-tube-planter"),
    gallery: [img("rectangular-tube-planter"), img("rectangular-tube-planter-2")],
    price: 650,
    size: "12 × 4 × 16 cm",
  },
  {
    slug: "square-tube-planter",
    name: "Square Tube Planter",
    category: "Home Décor",
    categorySlug: "planters",
    blurb: "A square frame with a round cut-out that holds a glass test tube for cuttings. Glass tube included.",
    image: img("square-tube-planter"),
    gallery: [img("square-tube-planter"), img("square-tube-planter-2")],
    price: 450,
    size: "13.5 × 4 × 13.5 cm",
  },

  // Vases
  {
    slug: "donut-vase",
    name: "Donut Vase",
    category: "Home Décor",
    categorySlug: "vases",
    blurb: "A donut-shaped vase for dried or faux stems.",
    image: img("donut-vase"),
    price: 650,
    size: "14.9 cm · 3.4 cm deep",
  },
  {
    slug: "pinstripe-round-vase",
    name: "Pinstripe Round Vase",
    category: "Home Décor",
    categorySlug: "vases",
    blurb: "A round vase with fine pinstripe ribbing, for dried stems and small blooms. Use a glass insert for fresh flowers.",
    image: img("pinstripe-round-vase"),
    gallery: [img("pinstripe-round-vase"), img("pinstripe-round-vase-2")],
    price: null,
    size: DIMENSIONS_TBC,
  },

  // Candles & tealights
  {
    slug: "heart-tealight-holder",
    name: "Heart Tealight Holder",
    category: "Home Décor",
    categorySlug: "candles-tealights",
    blurb: "A heart-shaped holder edged with a ring of beads, for a soft glow on any shelf.",
    image: img("heart-tealight-holder"),
    gallery: [img("heart-tealight-holder"), img("heart-tealight-holder-2")],
    price: 250,
    size: DIMENSIONS_TBC,
  },
  {
    slug: "oval-tealight-holder",
    name: "Oval Tealight Holder",
    category: "Home Décor",
    categorySlug: "candles-tealights",
    blurb: "A smooth oval holder with swirls of colour, for a shelf, a desk or a festive table.",
    image: img("oval-tealight-holder"),
    gallery: [img("oval-tealight-holder"), img("oval-tealight-holder-2")],
    price: 300,
    size: DIMENSIONS_TBC,
  },
  {
    slug: "spherical-tealight-holder",
    name: "Spherical Tealight Holder",
    category: "Home Décor",
    categorySlug: "candles-tealights",
    blurb: "A round holder swirled in colour that cups a single tealight.",
    image: img("spherical-tealight-holder"),
    gallery: [img("spherical-tealight-holder"), img("spherical-tealight-holder-2"), img("spherical-tealight-holder-3")],
    price: 500,
    size: DIMENSIONS_TBC,
  },
  {
    slug: "lotus-candle",
    name: "Lotus Candle",
    category: "Home Décor",
    categorySlug: "candles-tealights",
    blurb: "A lotus-shaped candle that opens like a flower. Made for festivals, lovely every day.",
    image: img("lotus-candle"),
    gallery: [img("lotus-candle"), img("lotus-candle-2")],
    price: 300,
    size: DIMENSIONS_TBC,
  },
  {
    slug: "tulip-candle",
    name: "Tulip Candle",
    category: "Home Décor",
    categorySlug: "candles-tealights",
    blurb: "A tulip-shaped candle in soft, blended colours.",
    image: img("tulip-candle"),
    gallery: [img("tulip-candle"), img("tulip-candle-2")],
    price: 275,
    size: "6.2 × 2.44 cm",
  },
  {
    slug: "goblet-candle",
    name: "Goblet Candle",
    category: "Home Décor",
    categorySlug: "candles-tealights",
    blurb: "A goblet-shaped candle marbled in green, lovely lit or unlit.",
    image: img("goblet-candle"),
    gallery: [img("goblet-candle"), img("goblet-candle-2")],
    price: 450,
    size: "8.5 × 5 × 7.5 cm",
  },
  {
    slug: "conch-shell-candle",
    name: "Conch Shell Candle",
    category: "Home Décor",
    categorySlug: "candles-tealights",
    blurb: "A conch shell candle in soft pastels, for a shelf that needs a little sea.",
    image: img("conch-shell-candle"),
    price: 300,
    size: "12.9 × 6.4 × 4 cm",
  },

  // Coasters
  {
    slug: "hexagonal-coaster-set",
    name: "Hexagonal Coaster Set",
    category: "Home Décor",
    categorySlug: "coasters",
    blurb: "Marbled hexagonal coasters for the table and the bar cart. Sets of 2 are ₹400, sets of 4 are ₹800 and sets of 6 are ₹1,200.",
    image: img("hexagonal-coaster-set"),
    price: 400,
    priceFrom: true,
    size: "Sold in sets of 2, 4 or 6",
  },
  {
    slug: "round-diamond-coaster-set",
    name: "Round Diamond Coaster Set",
    category: "Home Décor",
    categorySlug: "coasters",
    blurb: "Round coasters flecked with gold. Sets of 2 are ₹450, sets of 4 are ₹900 and sets of 6 are ₹1,350.",
    image: img("round-diamond-coaster-set"),
    price: 450,
    priceFrom: true,
    size: "Sold in sets of 2, 4 or 6",
  },

  // Trinket trays
  {
    slug: "bubble-tray",
    name: "Bubble Tray",
    category: "Gifting",
    categorySlug: "trinket-trays",
    blurb: "A tray edged with bubbles, for jewellery, keys or a candle on the vanity.",
    image: img("bubble-tray"),
    price: 300,
    size: DIMENSIONS_TBC,
  },
  {
    slug: "roped-heart-tray",
    name: "Roped Heart Tray",
    category: "Gifting",
    categorySlug: "trinket-trays",
    blurb: "A heart-shaped tray with a roped edge, for rings, keys and keepsakes.",
    image: img("roped-heart-tray"),
    price: 300,
    size: "13 × 12.4 cm",
  },
  {
    slug: "leaf-heart-tray",
    name: "Leaf Heart Tray",
    category: "Gifting",
    categorySlug: "trinket-trays",
    blurb: "A heart-shaped tray with a leaf imprint, for rings, keys and little keepsakes.",
    image: img("leaf-heart-tray"),
    price: 250,
    size: DIMENSIONS_TBC,
  },
  {
    slug: "capsule-trinket-tray",
    name: "Capsule Trinket Tray",
    category: "Gifting",
    categorySlug: "trinket-trays",
    blurb: "A long capsule tray for the vanity, for keys, jewellery or perfume.",
    image: img("capsule-trinket-tray"),
    price: 375,
    size: "20 × 10.5 cm",
  },

  // Jewellery boxes
  {
    slug: "jewellery-box",
    name: "Jewellery Box",
    category: "Gifting",
    categorySlug: "jewellery-boxes",
    blurb: "A lidded box with ribbed sides that keeps jewellery safe, and looks lovely doing it.",
    image: img("jewellery-box"),
    price: 400,
    size: DIMENSIONS_TBC,
  },
];

export const products: Product[] = catalogue.map((p) => ({ ...p, href: `/products/${p.slug}` }));

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

/** The pieces shown on the home page, best first. The hero shows all of them; the featured row, the first four. */
const featuredSlugs = [
  "prism-pot",
  "spherical-tealight-holder",
  "roped-heart-tray",
  "lotus-candle",
  "pinstripe-round-vase",
  "rectangular-tube-planter",
  "donut-vase",
  "oval-tealight-holder",
];
export const featuredProducts: Product[] = featuredSlugs.flatMap((s) => getProduct(s) ?? []);

/** Rupees with Indian digit grouping, e.g. ₹1,25,000. Done by hand so server and browser always agree. */
export function formatPrice(rupees: number) {
  const digits = String(Math.round(rupees));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `₹${rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},` : ""}${last3}`;
}

/** The price as shown on a tile or product page. */
export function priceLabel(p: Pick<Product, "price" | "priceFrom">) {
  if (p.price === null) return "Price on request";
  return p.priceFrom ? `From ${formatPrice(p.price)}` : formatPrice(p.price);
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
    image: img("prism-pot-2"),
    bg: "#DCDFD1",
  },
  {
    slug: "vases",
    name: "Vases",
    group: "Home Décor",
    blurb: "Sculptural vases for dried stems and fresh blooms.",
    image: img("pinstripe-round-vase-2"),
    bg: "#DCDFD1",
  },
  {
    slug: "candles-tealights",
    name: "Candles & tealights",
    group: "Home Décor",
    blurb: "Candles and holders that bring a soft glow to a shelf, a desk or a festive table.",
    image: img("spherical-tealight-holder-2"),
    bg: "#E1DAD3",
  },
  {
    slug: "coasters",
    name: "Coasters",
    group: "Home Décor",
    blurb: "Speckled and marbled coasters for the table and the bar cart.",
    image: img("hexagonal-coaster-set"),
    bg: "#E4C9B6",
  },
  {
    slug: "trinket-trays",
    name: "Trinket trays",
    group: "Gifting",
    blurb: "Little trays for rings, keys and keepsakes. A gift that stays.",
    image: img("roped-heart-tray"),
    bg: "#EBCFC8",
  },
  {
    slug: "jewellery-boxes",
    name: "Jewellery boxes",
    group: "Gifting",
    blurb: "Lidded boxes that keep jewellery safe, and look lovely doing it.",
    image: img("jewellery-box"),
    bg: "#D3DAE0",
  },
];

export const categories: Category[] = categoryList.map((c) => ({ ...c, href: `/shop/${c.slug}` }));

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);

export const productsIn = (slug: string) => products.filter((p) => p.categorySlug === slug);

/** Shop link for a menu label: its category page when one matches, otherwise the whole shop. */
export const shopHref = (label: string) =>
  categories.find((c) => c.name.toLowerCase() === label.toLowerCase())?.href ?? "/shop";
