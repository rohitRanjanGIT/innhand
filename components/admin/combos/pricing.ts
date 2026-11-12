// Pure pricing helpers for the admin combo screens (server list + live editor).
import { discountAmount, type Discount } from "@/lib/pricing";

/** One product as the combo editor sees it: its finishes and their variants (priced or not). */
export type AdminComboProduct = {
  id: string;
  name: string;
  status: "draft" | "active" | "archived";
  finishes: {
    productFinishId: string;
    name: string;
    isDefault: boolean;
    /** False when the product finish or the finish itself is switched off. */
    active: boolean;
    /** Per-piece extra of the options a shopper starts on (required effect slots). */
    defaultExtra: number;
    variants: { setSize: number; price: number | null; active: boolean }[];
  }[];
};

export type AdminComboItem = { productId: string; productFinishId: string | null; setSize: number };

/** Price of one piece at its defaults, or null with the reason it can't be priced. */
export function adminPiecePrice(
  item: AdminComboItem,
  product: AdminComboProduct | undefined,
): { price: number } | { price: null; reason: string } {
  if (!product) return { price: null, reason: "Product not found" };
  if (product.status !== "active") return { price: null, reason: `${product.name} is ${product.status}` };
  const f = product.finishes.find((x) => x.productFinishId === item.productFinishId);
  if (!f) return { price: null, reason: `${product.name}: pick a finish` };
  if (!f.active) return { price: null, reason: `${product.name}: ${f.name} is switched off` };
  const v = f.variants.find((x) => x.setSize === item.setSize);
  if (!v || !v.active || v.price === null)
    return { price: null, reason: `${product.name}: ${f.name} × ${item.setSize} has no price` };
  return { price: v.price + f.defaultExtra * item.setSize };
}

/** Pieces total, saving and combo price at the defaults; `hidden` lists why the shop would hide it. */
export function adminComboPricing(items: AdminComboItem[], productsById: Map<string, AdminComboProduct>, d: Discount) {
  const hidden: string[] = [];
  let piecesTotal = 0;
  for (const it of items) {
    const r = adminPiecePrice(it, productsById.get(it.productId));
    if (r.price === null) hidden.push(r.reason);
    else piecesTotal += r.price;
  }
  if (items.length < 2) hidden.push("A combo needs at least 2 pieces");
  const saving = discountAmount(piecesTotal, d);
  return { piecesTotal, saving, total: piecesTotal - saving, hidden };
}
