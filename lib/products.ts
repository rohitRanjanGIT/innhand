export type Product = {
  slug: string;
  name: string;
  /** Shop category, shown under the name. */
  category: string;
  blurb: string;
  image: string;
  /** Placeholder until real prices are set. */
  price: string;
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
    blurb: "A pair of sculptural vases, hand-poured in the colours you choose.",
    image: "/assets/cards/vases.svg",
    price: "₹[price]",
    size: "[dimensions]",
  },
  {
    slug: "leaf-heart-tray",
    name: "Leaf Heart Tray",
    category: "Gifting",
    blurb: "A heart-shaped tray with a leaf imprint, for rings, keys and little keepsakes.",
    image: "/assets/cards/heart-tray.svg",
    price: "₹[price]",
    size: "[dimensions]",
  },
  {
    slug: "bubble-tray-tulip-candles",
    name: "Bubble Tray with Tulip Candles",
    category: "Gifting",
    blurb: "A bubble tray paired with tulip candles. A gift that is ready to glow.",
    image: "/assets/cards/tulip-tray.svg",
    price: "₹[price]",
    size: "[dimensions]",
  },
  {
    slug: "coaster-set",
    name: "Coaster Set",
    category: "Home Décor",
    blurb: "Speckled coasters for the table and the bar cart, poured in your colours.",
    image: "/assets/cards/coasters.svg",
    price: "₹[price]",
    size: "[dimensions]",
  },
  {
    slug: "tealight-holders",
    name: "Tealight Holders",
    category: "Home Décor",
    blurb: "Little holders that bring a soft glow to a shelf, a desk or a festive table.",
    image: "/assets/cards/tealights.svg",
    price: "₹[price]",
    size: "[dimensions]",
  },
];

export const products: Product[] = catalogue.map((p) => ({ ...p, href: `/products/${p.slug}` }));

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

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

/** A shop category tile. Without an `image` the tile shows a tinted placeholder. */
export type Category = { name: string; group: string; image?: string; bg: string; href: string };

export const categories: Category[] = [
  { name: "Planters", group: "Home Décor", bg: "#DCDFD1", href: "#" },
  { name: "Vases", group: "Home Décor", image: "/assets/cards/vases.svg", bg: "#DCDFD1", href: "#" },
  { name: "Tealight holders", group: "Home Décor", image: "/assets/cards/tealights.svg", bg: "#E1DAD3", href: "#" },
  { name: "Trinket trays", group: "Gifting", image: "/assets/cards/heart-tray.svg", bg: "#EBCFC8", href: "#" },
  { name: "Jewellery boxes", group: "Gifting", bg: "#D3DAE0", href: "#" },
];
