// Imports today's catalogue (21 products, 6 categories, 7 colours, 32 photos) into Neon.
//   npm run db:seed            — refuses if products already exist
//   npm run db:seed -- --reset — wipes the catalogue tables first (not users, carts are cleared)
import { sql } from "drizzle-orm";
import { db } from "./index";
import * as s from "./schema";
import data from "./seed-data.json";

type SeedProduct = (typeof data.products)[number] & { gallery?: string[]; priceFrom?: boolean };

const reset = process.argv.includes("--reset");

const FINISHES = [
  { name: "Marble", slug: "marble", description: "Swirls of a second colour through the base.", second: "Swirl colour" },
  { name: "Terrazzo", slug: "terrazzo", description: "Chips of colour set into the base.", second: "Chip colour" },
  { name: "Speckled", slug: "speckled", description: "Fine flecks over the base colour.", second: "Speckle colour" },
  { name: "Matte", slug: "matte", description: "One smooth, solid colour.", second: null },
] as const;

/** Sample effect so the effect picker has something to show. Edit or remove it in the admin. */
const SAMPLE_EFFECT = {
  label: "Flakes",
  finishes: ["marble", "terrazzo"],
  options: [
    { name: "None", extraPrice: 0 },
    { name: "Gold leaf", extraPrice: 50 },
    { name: "Silver leaf", extraPrice: 50 },
  ],
};

const TAGS = [
  {
    slug: "diwali",
    name: "Diwali Gifting",
    blurb: "Candles, holders and trays for the festival of lights.",
    categories: ["candles-tealights", "trinket-trays"],
  },
  {
    slug: "housewarming",
    name: "Housewarming",
    blurb: "Planters, trays and candles for a new home.",
    categories: ["planters", "trinket-trays", "candles-tealights"],
  },
  {
    slug: "corporate-hotels",
    name: "Corporate & Hotels",
    blurb: "Test tube planters and coaster sets, made in quantity.",
    products: ["rectangular-tube-planter", "square-tube-planter"],
    categories: ["coasters"],
  },
];

/** Set prices for the coaster sets, from their catalogue blurbs. */
const SET_PRICES: Record<string, Record<number, number>> = {
  "hexagonal-coaster-set": { 2: 400, 4: 800, 6: 1200 },
  "round-diamond-coaster-set": { 2: 450, 4: 900, 6: 1350 },
};

async function main() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.products);
  if (n > 0 && !reset) {
    console.log(`Products already exist (${n}). Run with --reset to wipe and re-seed the catalogue.`);
    return;
  }

  await db.transaction(async (tx) => {
    if (reset) {
      await tx.execute(sql`truncate table
        cart_item_effects, cart_items, cart_bundles, carts, wishlist_items,
        combo_images, combo_items, combos, combo_discount_tiers,
        nav_links, nav_groups, nav_sections,
        product_related, product_variants, product_finish_images, product_finishes, product_tags, products,
        tags, categories, media,
        colourway_colours, colourways, finish_effect_options, finish_effect_slots, finish_colour_slots, finishes,
        colours, store_settings cascade`);
    }

    await tx.insert(s.storeSettings).values({ id: 1 }).onConflictDoNothing();

    // Colours
    const colourRows = await tx
      .insert(s.colours)
      .values(data.colours.map((c, i) => ({ name: c.name, hex: c.hex, sort: i })))
      .returning();
    const colourId = (name: string) => colourRows.find((c) => c.name === name)!.id;

    // Finishes, slots, colourways, sample effect
    const finishRows: Record<string, string> = {};
    for (const [i, f] of FINISHES.entries()) {
      const [row] = await tx
        .insert(s.finishes)
        .values({ name: f.name, slug: f.slug, description: f.description, sort: i })
        .returning();
      finishRows[f.slug] = row.id;
      const slots = await tx
        .insert(s.finishColourSlots)
        .values([
          { finishId: row.id, position: 0, label: "Base colour" },
          ...(f.second ? [{ finishId: row.id, position: 1, label: f.second }] : []),
        ])
        .returning();
      const [baseSlot, secondSlot] = [slots.find((x) => x.position === 0)!, slots.find((x) => x.position === 1)];
      for (const [ci, c] of data.colours.entries()) {
        const accent = c.name === "Ivory" ? "Plum" : c.name === "Plum" ? "Ivory" : "Ivory";
        const name = secondSlot ? `${c.name} + ${accent} ${f.second!.split(" ")[0].toLowerCase()}` : c.name;
        const [cw] = await tx.insert(s.colourways).values({ finishId: row.id, name, sort: ci }).returning();
        await tx.insert(s.colourwayColours).values([
          { colourwayId: cw.id, slotId: baseSlot.id, colourId: colourId(c.name) },
          ...(secondSlot ? [{ colourwayId: cw.id, slotId: secondSlot.id, colourId: colourId(accent) }] : []),
        ]);
      }
      if ((SAMPLE_EFFECT.finishes as readonly string[]).includes(f.slug)) {
        const [slot] = await tx
          .insert(s.finishEffectSlots)
          .values({ finishId: row.id, position: 0, label: SAMPLE_EFFECT.label, required: false })
          .returning();
        await tx
          .insert(s.finishEffectOptions)
          .values(SAMPLE_EFFECT.options.map((o, oi) => ({ slotId: slot.id, ...o, sort: oi })));
      }
    }

    // Media: every photo in /public/assets/products becomes a media row with a `local:` key.
    const allImages = new Set<string>();
    for (const p of data.products as SeedProduct[]) {
      allImages.add(p.image);
      p.gallery?.forEach((g) => allImages.add(g));
    }
    data.categories.forEach((c) => c.image && allImages.add(c.image));
    const mediaRows = await tx
      .insert(s.media)
      .values([...allImages].map((path) => ({ r2Key: `local:${path}`, width: 900, height: 1200, processed: true })))
      .returning();
    const mediaId = (path: string) => mediaRows.find((m) => m.r2Key === `local:${path}`)!.id;

    // Categories: head categories from `group`, sub-categories under them.
    const heads = [...new Set(data.categories.map((c) => c.group))];
    const headIds: Record<string, string> = {};
    for (const [i, h] of heads.entries()) {
      const slug = h.toLowerCase().replace(/é/g, "e").replace(/[^a-z0-9]+/g, "-");
      const [row] = await tx.insert(s.categories).values({ name: h, slug, sort: i }).returning();
      headIds[h] = row.id;
    }
    const catIds: Record<string, string> = {};
    for (const [i, c] of data.categories.entries()) {
      const [row] = await tx
        .insert(s.categories)
        .values({
          parentId: headIds[c.group],
          name: c.name,
          slug: c.slug,
          blurb: c.blurb,
          bgColour: c.bg,
          imageId: c.image ? mediaId(c.image) : null,
          sort: i,
        })
        .returning();
      catIds[c.slug] = row.id;
    }

    // Products, every one in all four finishes at today's price.
    const productIds: Record<string, string> = {};
    for (const p of data.products as SeedProduct[]) {
      const sets = SET_PRICES[p.slug];
      const featuredRank = data.featured.indexOf(p.slug);
      const [row] = await tx
        .insert(s.products)
        .values({
          slug: p.slug,
          name: p.name,
          categoryId: catIds[p.categorySlug],
          blurb: p.blurb,
          description: p.blurb,
          sizeText: p.size === "[dimensions]" ? "" : p.size,
          soldInSets: !!sets,
          status: "active",
          featuredRank: featuredRank >= 0 ? featuredRank + 1 : null,
        })
        .returning();
      productIds[p.slug] = row.id;
      const photos = p.gallery ?? [p.image];
      for (const [fi, f] of FINISHES.entries()) {
        const [pf] = await tx
          .insert(s.productFinishes)
          .values({ productId: row.id, finishId: finishRows[f.slug], sort: fi, isDefault: fi === 0 })
          .returning();
        await tx
          .insert(s.productFinishImages)
          .values(photos.map((path, pi) => ({ productFinishId: pf.id, mediaId: mediaId(path), sort: pi })));
        await tx.insert(s.productVariants).values(
          sets
            ? Object.entries(sets).map(([size, price]) => ({ productFinishId: pf.id, setSize: Number(size), price }))
            : [{ productFinishId: pf.id, setSize: 1, price: p.price }],
        );
      }
    }

    // Tags (occasions)
    const tagIds: Record<string, string> = {};
    for (const t of TAGS) {
      const [row] = await tx.insert(s.tags).values({ name: t.name, slug: t.slug, blurb: t.blurb }).returning();
      tagIds[t.slug] = row.id;
      const slugs = new Set<string>(t.products ?? []);
      for (const p of data.products) if (t.categories.includes(p.categorySlug)) slugs.add(p.slug);
      if (slugs.size)
        await tx.insert(s.productTags).values([...slugs].map((slug) => ({ productId: productIds[slug], tagId: row.id })));
    }

    // Navigation: "By Category" mirrors the tree; "By Occasion" is today's hand-built menu.
    await tx.insert(s.navSections).values({ heading: "By Category", mode: "categories", sort: 0 });
    const [occ] = await tx.insert(s.navSections).values({ heading: "By Occasion", mode: "manual", sort: 1 }).returning();
    const groups: { title: string; highlight?: boolean; links: { label: string; type: "category" | "tag"; slug: string }[] }[] = [
      { title: "Diwali Gifting", highlight: true, links: [{ label: "Candles with trays", type: "tag", slug: "diwali" }] },
      {
        title: "Housewarming",
        links: [
          { label: "Planters", type: "category", slug: "planters" },
          { label: "Trays", type: "category", slug: "trinket-trays" },
          { label: "Candles & tealights", type: "category", slug: "candles-tealights" },
        ],
      },
      {
        title: "Corporate & Hotels",
        links: [
          { label: "Test tube planters", type: "tag", slug: "corporate-hotels" },
          { label: "Coaster sets", type: "category", slug: "coasters" },
        ],
      },
    ];
    for (const [gi, g] of groups.entries()) {
      const [grp] = await tx
        .insert(s.navGroups)
        .values({ sectionId: occ.id, title: g.title, highlight: !!g.highlight, sort: gi })
        .returning();
      await tx.insert(s.navLinks).values(
        g.links.map((l, li) => ({
          groupId: grp.id,
          label: l.label,
          targetType: l.type,
          targetId: l.type === "category" ? catIds[l.slug] : tagIds[l.slug],
          sort: li,
        })),
      );
    }

    // Shopper-built combo tiers, and one sample combo.
    await tx.insert(s.comboDiscountTiers).values([
      { itemCount: 2, discountType: "percent", discountValue: 5 },
      { itemCount: 3, discountType: "percent", discountValue: 10 },
      { itemCount: 4, discountType: "percent", discountValue: 15 },
    ]);
    const [combo] = await tx
      .insert(s.combos)
      .values({
        slug: "lotus-light-set",
        name: "Lotus Light Set",
        description: "A lotus candle on a roped heart tray. A sample combo: edit or archive it in the admin.",
        discountType: "amount",
        discountValue: 50,
        status: "active",
      })
      .returning();
    for (const [i, slug] of ["lotus-candle", "roped-heart-tray"].entries()) {
      const pf = await tx.query.productFinishes.findFirst({
        where: (t, { and, eq }) => and(eq(t.productId, productIds[slug]), eq(t.isDefault, true)),
      });
      await tx.insert(s.comboItems).values({ comboId: combo.id, productId: productIds[slug], defaultProductFinishId: pf!.id, sort: i });
    }
    await tx.insert(s.comboImages).values({ comboId: combo.id, mediaId: mediaId("/assets/products/lotus-candle-2.jpg") });
  });

  console.log("Seeded the catalogue.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
