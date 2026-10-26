// Dummy data for the cart, wishlist and account pages until there is a real backend.

import { getProduct, type Product } from "./products";

/** One product in a chosen colour and finish. */
export type LineItem = { slug: string; colour: string; finish: string; qty: number };

export type CartLine = LineItem & { id: string };

export const demoCart: CartLine[] = [
  { id: "line-1", slug: "leaf-heart-tray", colour: "Blush", finish: "Marble", qty: 1 },
  { id: "line-2", slug: "tealight-holders", colour: "Sage", finish: "Speckled", qty: 2 },
];

/** Shown on the header's cart badge. */
export const demoCartCount = demoCart.reduce((n, l) => n + l.qty, 0);

export const demoWishlist = ["flower-vases", "coaster-set", "bubble-tray-tulip-candles"];

export const SHIPPING_FEE = 99;
export const FREE_SHIPPING_FROM = 1500;

export const shippingFor = (subtotal: number) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

/** Pairs each line with its product, dropping any whose product no longer exists. */
export function withProducts<T extends LineItem>(lines: T[]): (T & { product: Product })[] {
  return lines.flatMap((l) => {
    const product = getProduct(l.slug);
    return product ? [{ ...l, product }] : [];
  });
}

export const subtotalOf = (lines: LineItem[]) =>
  withProducts(lines).reduce((sum, l) => sum + l.product.price * l.qty, 0);

export const demoUser = {
  name: "Aarohi Mehta",
  firstName: "Aarohi",
  email: "aarohi@example.com",
  phone: "+91 98765 43210",
  memberSince: "March 2026",
};

/** A made-to-order piece moves through these steps. */
export const orderSteps = ["Ordered", "Being poured", "Curing", "Shipped", "Delivered"] as const;
export type OrderStatus = (typeof orderSteps)[number];

export type Order = { id: string; placed: string; status: OrderStatus; items: LineItem[] };

export const demoOrders: Order[] = [
  {
    id: "IH-1048",
    placed: "21 Oct 2026",
    status: "Being poured",
    items: [{ slug: "flower-vases", colour: "Sage", finish: "Terrazzo", qty: 1 }],
  },
  {
    id: "IH-1031",
    placed: "2 Oct 2026",
    status: "Shipped",
    items: [
      { slug: "bubble-tray-tulip-candles", colour: "Mist", finish: "Matte", qty: 1 },
      { slug: "tealight-holders", colour: "Ivory", finish: "Speckled", qty: 2 },
    ],
  },
  {
    id: "IH-1012",
    placed: "14 Aug 2026",
    status: "Delivered",
    items: [
      { slug: "coaster-set", colour: "Plum", finish: "Marble", qty: 2 },
      { slug: "leaf-heart-tray", colour: "Blush", finish: "Matte", qty: 1 },
    ],
  },
];

export type Address = {
  id: string;
  label: string;
  name: string;
  lines: string[];
  phone: string;
  isDefault: boolean;
};

export const demoAddresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    name: "Aarohi Mehta",
    lines: ["Flat 4B, Lotus Residency", "Linking Road, Bandra West", "Mumbai, Maharashtra 400050"],
    phone: "+91 98765 43210",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Office",
    name: "Aarohi Mehta",
    lines: ["Level 3, Palm Court", "Sector 29", "Gurugram, Haryana 122001"],
    phone: "+91 98765 43210",
    isDefault: false,
  },
];
