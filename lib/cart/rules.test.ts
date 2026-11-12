import { describe, expect, it } from "vitest";
import { bundleDiscount, bundleKey, checkEffects, lineKey, maxBundleQty, planMerge, productTotals } from "./rules";

describe("lineKey", () => {
  it("ignores effect order and duplicates", () => {
    expect(lineKey("v1", "c1", ["b", "a", "a"])).toBe(lineKey("v1", "c1", ["a", "b"]));
  });
  it("tells colourways and effects apart", () => {
    expect(lineKey("v1", "c1", [])).not.toBe(lineKey("v1", "c2", []));
    expect(lineKey("v1", null, [])).not.toBe(lineKey("v1", null, ["x"]));
  });
});

describe("bundleKey", () => {
  it("ignores piece order, but not the combo or the pieces", () => {
    expect(bundleKey("combo", "k", ["a", "b"])).toBe(bundleKey("combo", "k", ["b", "a"]));
    expect(bundleKey("custom", null, ["a", "b"])).toBe(bundleKey("custom", null, ["b", "a"]));
    expect(bundleKey("combo", "k", ["a", "b"])).not.toBe(bundleKey("combo", "j", ["a", "b"]));
    expect(bundleKey("custom", null, ["a", "b"])).not.toBe(bundleKey("custom", null, ["a", "c"]));
  });
});

describe("cart limits", () => {
  it("counts a product across loose lines and bundles", () => {
    const t = productTotals(
      [
        { productId: "p", qty: 2 },
        { productId: "p", qty: 1 },
      ],
      [{ qty: 2, items: [{ productId: "p", qty: 1 }, { productId: "q", qty: 1 }] }],
    );
    expect(t.get("p")).toBe(5);
    expect(t.get("q")).toBe(2);
  });
  it("caps a bundle by its tightest piece", () => {
    const totals = new Map([["p", 8]]);
    expect(maxBundleQty([{ productId: "p", qty: 1 }, { productId: "q", qty: 1 }], totals, () => 10)).toBe(2);
    expect(maxBundleQty([{ productId: "p", qty: 2 }], totals, () => 10)).toBe(1);
    expect(maxBundleQty([{ productId: "p", qty: 1 }], new Map([["p", 10]]), () => 10)).toBe(0);
  });
});

describe("planMerge", () => {
  const limit = (n: number) => () => n;

  it("adds matching lines up, capped at the limit", () => {
    const plan = planMerge({
      userLines: [{ id: "u1", productId: "p", key: "k1", qty: 7 }],
      userBundles: [],
      guestLines: [{ id: "g1", productId: "p", key: "k1", qty: 5 }],
      guestBundles: [],
      limitOf: limit(10),
    });
    expect(plan).toEqual({ increase: [{ id: "u1", qty: 10 }], move: [], moveBundles: [] });
  });

  it("moves new lines and drops what no longer fits", () => {
    const plan = planMerge({
      userLines: [{ id: "u1", productId: "p", key: "k1", qty: 9 }],
      userBundles: [],
      guestLines: [
        { id: "g1", productId: "p", key: "k2", qty: 3 },
        { id: "g2", productId: "q", key: "k3", qty: 2 },
        { id: "g3", productId: "p", key: "k4", qty: 1 },
      ],
      guestBundles: [],
      limitOf: limit(10),
    });
    expect(plan.increase).toEqual([]);
    expect(plan.move).toEqual([
      { id: "g1", qty: 1 },
      { id: "g2", qty: 2 },
    ]);
  });

  it("uses each product's own limit", () => {
    const plan = planMerge({
      userLines: [],
      userBundles: [],
      guestLines: [
        { id: "g1", productId: "p", key: "k1", qty: 6 },
        { id: "g2", productId: "q", key: "k2", qty: 6 },
      ],
      guestBundles: [],
      limitOf: (id) => (id === "p" ? 4 : 10),
    });
    expect(plan.move).toEqual([
      { id: "g1", qty: 4 },
      { id: "g2", qty: 6 },
    ]);
  });

  it("moves bundles whole, capping their qty", () => {
    const plan = planMerge({
      userLines: [{ id: "u1", productId: "p", key: "k1", qty: 8 }],
      userBundles: [],
      guestLines: [],
      guestBundles: [
        { id: "b1", qty: 3, items: [{ productId: "p", qty: 1 }, { productId: "q", qty: 1 }] },
        { id: "b2", qty: 1, items: [{ productId: "p", qty: 1 }] },
      ],
      limitOf: limit(10),
    });
    expect(plan.moveBundles).toEqual([{ id: "b1", qty: 2 }]);
  });

  it("counts the user's bundles against the limit", () => {
    const plan = planMerge({
      userLines: [],
      userBundles: [{ id: "ub", qty: 5, items: [{ productId: "p", qty: 2 }] }],
      guestLines: [{ id: "g1", productId: "p", key: "k", qty: 1 }],
      guestBundles: [],
      limitOf: limit(10),
    });
    expect(plan.move).toEqual([]);
  });
});

describe("bundleDiscount (rule 9)", () => {
  const tiers = [
    { itemCount: 2, discountType: "percent" as const, discountValue: 5 },
    { itemCount: 3, discountType: "percent" as const, discountValue: 10 },
  ];
  it("gives an active combo its saving", () => {
    expect(
      bundleDiscount({ kind: "combo", combo: { status: "active", discountType: "amount", discountValue: 50 } }),
    ).toEqual({ discount: { type: "amount", value: 50 }, notice: null });
  });
  it("drops the saving of a withdrawn combo, with a notice", () => {
    const r = bundleDiscount({ kind: "combo", combo: { status: "archived", discountType: "amount", discountValue: 50 } });
    expect(r.discount).toBeNull();
    expect(r.notice).toMatch(/no longer offered/);
    expect(bundleDiscount({ kind: "combo", combo: null }).discount).toBeNull();
  });
  it("uses the tier for the piece count", () => {
    expect(bundleDiscount({ kind: "custom", pieceCount: 3, customCombosEnabled: true, tiers }).discount).toEqual({
      type: "percent",
      value: 10,
    });
  });
  it("drops the saving when custom combos are off or no tier fits", () => {
    expect(bundleDiscount({ kind: "custom", pieceCount: 3, customCombosEnabled: false, tiers }).notice).toMatch(/switched off/);
    expect(bundleDiscount({ kind: "custom", pieceCount: 4, customCombosEnabled: true, tiers }).discount).toBeNull();
  });
});

describe("checkEffects", () => {
  const slots = [
    { id: "s1", label: "Flakes", required: true, optionIds: ["a", "b"] },
    { id: "s2", label: "Glitter", required: false, optionIds: ["c"] },
  ];
  it("accepts one option per slot", () => {
    expect(checkEffects(slots, ["a"])).toBeNull();
    expect(checkEffects(slots, ["b", "c"])).toBeNull();
  });
  it("refuses two options from one slot, unknown options and missing required slots", () => {
    expect(checkEffects(slots, ["a", "b"])).toMatch(/one option/);
    expect(checkEffects(slots, ["a", "zzz"])).toMatch(/no longer available/);
    expect(checkEffects(slots, ["c"])).toMatch(/flakes/);
  });
});
