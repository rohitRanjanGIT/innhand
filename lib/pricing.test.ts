import { describe, expect, it } from "vitest";
import {
  bundleTotal,
  cartTotals,
  discountAmount,
  formatPrice,
  lineTotal,
  listingPrice,
  remainingAllowance,
  savingFromComboPrice,
  shippingFor,
  tierFor,
  unitPrice,
} from "./pricing";

const ship = { shippingFee: 99, freeShippingFrom: 1500 };

describe("line prices", () => {
  it("adds effect extras once per piece in the set", () => {
    expect(unitPrice({ variantPrice: 800, effectExtras: [50, 20], setSize: 4 })).toBe(800 + 70 * 4);
  });
  it("multiplies by quantity", () => {
    expect(lineTotal({ variantPrice: 400, effectExtras: [], setSize: 1, qty: 3 })).toBe(1200);
  });
  it("is null when the variant is priced on request", () => {
    expect(lineTotal({ variantPrice: null, effectExtras: [50], setSize: 1, qty: 1 })).toBeNull();
  });
});

describe("discounts", () => {
  it("rounds percentages to the nearest rupee", () => {
    expect(discountAmount(999, { type: "percent", value: 10 })).toBe(100);
    expect(discountAmount(1005, { type: "percent", value: 5 })).toBe(50);
  });
  it("never goes below zero", () => {
    expect(discountAmount(300, { type: "amount", value: 500 })).toBe(300);
    expect(discountAmount(300, { type: "percent", value: 150 })).toBe(300);
  });
  it("ignores empty discounts", () => {
    expect(discountAmount(300, null)).toBe(0);
    expect(discountAmount(300, { type: "amount", value: 0 })).toBe(0);
  });
});

describe("bundles", () => {
  const lines = [
    { variantPrice: 600, effectExtras: [], setSize: 1, qty: 1 },
    { variantPrice: 400, effectExtras: [50], setSize: 2, qty: 1 },
  ];
  it("keeps the same saving when finishes change the total", () => {
    const b = bundleTotal(lines, { type: "amount", value: 200 });
    expect(b).toEqual({ piecesTotal: 1100, saving: 200, total: 900, priced: true });
  });
  it("multiplies by bundle quantity", () => {
    expect(bundleTotal(lines, { type: "amount", value: 200 }, 2).total).toBe(1800);
  });
  it("loses its discount when withdrawn", () => {
    expect(bundleTotal(lines, null).total).toBe(1100);
  });
  it("cannot be totalled with an unpriced piece", () => {
    expect(bundleTotal([...lines, { variantPrice: null, effectExtras: [], setSize: 1, qty: 1 }], null).priced).toBe(
      false,
    );
  });
  it("derives the saving from the admin's typed combo price", () => {
    expect(savingFromComboPrice(1200, 1000)).toBe(200);
    expect(savingFromComboPrice(1000, 1200)).toBe(0);
  });
  it("picks the tier for the piece count", () => {
    const tiers = [
      { itemCount: 2, discountType: "percent", discountValue: 5 },
      { itemCount: 3, discountType: "percent", discountValue: 10 },
    ];
    expect(tierFor(tiers, 3)?.discountValue).toBe(10);
    expect(tierFor(tiers, 4)).toBeNull();
  });
});

describe("cart totals and shipping", () => {
  it("charges shipping under the threshold only", () => {
    expect(shippingFor(0, ship)).toBe(0);
    expect(shippingFor(1499, ship)).toBe(99);
    expect(shippingFor(1500, ship)).toBe(0);
  });
  it("adds loose lines and bundles", () => {
    const t = cartTotals(
      [{ variantPrice: 300, effectExtras: [], setSize: 1, qty: 2 }],
      [{ piecesTotal: 1000, saving: 100, total: 900, priced: true }],
      ship,
    );
    expect(t).toEqual({ subtotal: 1500, savings: 100, shipping: 0, total: 1500 });
  });
});

describe("listing price", () => {
  it("shows From when prices differ", () => {
    expect(listingPrice([800, 400, null, 1200])).toEqual({ price: 400, from: true });
    expect(listingPrice([400, 400])).toEqual({ price: 400, from: false });
    expect(listingPrice([null])).toEqual({ price: null, from: false });
  });
});

describe("cart limit", () => {
  it("counts what is already in the cart", () => {
    expect(remainingAllowance(5, 3)).toBe(2);
    expect(remainingAllowance(5, 7)).toBe(0);
  });
});

describe("formatPrice", () => {
  it("uses Indian grouping", () => {
    expect(formatPrice(125000)).toBe("₹1,25,000");
    expect(formatPrice(999)).toBe("₹999");
  });
});
