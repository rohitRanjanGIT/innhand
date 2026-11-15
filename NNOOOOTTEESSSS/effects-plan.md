# Effects library plan

Status: built 2026-11-14. Migration `db/migrations/0003_effects_library.sql` applied (it also raised SEC from 1 to 2, since SEC now counts effects). Written 2026-11-14, revised the same day.

**Changed 2026-11-15 (migration `0004_effect_slots.sql`):** effects now work like colours. A finish has up to SEC named effect slots; in each slot the admin ticks library effects and prices them. The shopper picks one effect per slot, or None (no slot is required). SEC counts slots again (max 6). Existing effects were moved into one slot named "Effect" on each finish. 

**Changed again 2026-11-15 (migration `0005_effect_combinations.sql`):** effects now mirror colour slots and colourways exactly. Effect slots are names only (up to SEC). **Effect combinations** (like colourways) pick one library effect for every slot and carry their own selling and cost price; the admin switches each on or off. The shopper picks one combination, or None. Each previously ticked effect became a one-slot combination with the same name and prices. Sections 1–6 below describe the first version.

Revision: effects are added to **finishes** (not ticked per product), prices are set **per finish**, and an effect has an **image** where a colour has a hex value.

## 1. What changes

**Today.** Effects are typed inside each finish as "slots" ("Flakes") with options ("Gold leaf", +₹50). There is no shared list, no image and no cost price.

**After.**

1. The admin's **Colours** page becomes **Colours / Effects**, with one tab for each.
2. On the Effects tab the admin adds an effect with a **name** and an **image**. It works like the colour list: reorder, archive, delete. No prices here.
3. In the **finish editor** the admin adds effects from that list to the finish, and sets a **selling price** and a **cost price** for each one on that finish. The same effect can cost different amounts on Marble and on Terrazzo.
4. Every product that comes in that finish offers the finish's effects, as today. Nothing changes in the product editor.
5. On the product page the shopper sees the effects with their image and price.

Effect slots and options are removed.

## 2. Decisions (confirmed 2026-11-14)

| # | Question | Decision |
| --- | --- | --- |
| 1 | How many effects can a shopper pick on one piece? | One, the same way they pick one colourway. Because effects are optional, the list starts with "None". The Settings number (SEC) keeps its meaning: the most effects a finish can offer. |
| 2 | Is the effect price per piece or per set? | Per piece, multiplied by the set size, as today (pricing rule 1). |
| 3 | Can an effect be compulsory? | No. Effects are always optional extras. Today's "required" switch goes away. |
| 4 | Is the image required? | Yes for new effects. Effects carried over from today's data start without one until it is added. |

## 3. Data model

### New

| Table | Columns | Notes |
| --- | --- | --- |
| `effects` | name, image_id, sort, active | The library. `image_id` points at `media` (R2), like every other image. |
| `finish_effects` | finish_id, effect_id, selling_price, cost_price, sort, active | An effect on a finish, with its prices. One row per pair. `selling_price` is whole rupees per piece. `cost_price` is optional and admin-only. |

### Changed

| Table | Change |
| --- | --- |
| `cart_item_effects` | `effect_option_id` becomes `finish_effect_id`, pointing at `finish_effects`. |

`store_settings.effect_count` (SEC) is unchanged: the most effects one finish can have.

### Removed

`finish_effect_slots` and `finish_effect_options`.

### Migration (one SQL migration, in this order)

1. Create `effects` and `finish_effects`.
2. Copy each distinct option name into `effects` (no image yet). Skip options called "None" with no price.
3. For each old option, add a `finish_effects` row on its finish with `extra_price` as the selling price.
4. Add `finish_effect_id` to `cart_item_effects`, fill it from the old option ids, delete rows that pointed at a skipped "None", then drop `effect_option_id`.
5. Drop the two old tables.

The only effect data today is the seed's sample, so this is low risk, but it still keeps carts intact. `db/seed.ts` is updated to match.

## 4. Rules

- **Price.** Unit price = variant price + (the chosen effect's selling price × set size). `lib/pricing.ts` does not change.
- **What a shopper may choose.** At most one effect per piece. It must be active in the library, active on that finish, and belong to the finish of the chosen variant. Checked on the server on every add to cart.
- **Cart lines.** Same line when variant, colourway and effect match. Unchanged.
- **Library: archive, not delete.** An effect used by any finish can only be archived (Active off). Archiving hides it everywhere.
- **Finish: removing an effect.** Allowed unless a cart holds it; then it can only be switched off on that finish. Cart lines holding a switched-off effect are flagged as unavailable, as today.
- **Images.** Uploaded and resized through the existing R2 flow. Replacing or deleting an effect's image removes the old files when nothing else uses them.
- **Cost price never reaches the storefront.** Storefront reads select name, image and selling price only.
- **SEC.** A finish cannot have more effects than the Settings number, and the number cannot go below what a finish already has. Both as today.

## 5. Admin screens

### Colours / Effects (`/admin/colours`)

- Sidebar label and page title become "Colours / Effects". The address stays; `?tab=effects` opens the second tab.
- **Colours tab:** today's screen, unchanged.
- **Effects tab:** the same layout. Each row shows the image thumbnail in place of the colour swatch, the name, "on N finishes", an Active switch, edit and delete. Drag to reorder. "Add effect" opens a dialog with Name, Image (upload) and Active.
- Delete is disabled while any finish uses the effect.

### Finish editor (`/admin/finishes/[id]`)

- The effect slots section is replaced by an **Effects** card.
- "Add effect" picks from the library (thumbnail and name); effects already on the finish are not offered again. A link goes to the library to create a new one.
- Each added effect is a row: thumbnail, name, **Selling price**, **Cost price**, margin, an Active switch and remove. Drag to set the order shoppers see.
- The card shows how many of the allowed effects (SEC) are used.

### Unchanged

Product editor, Settings and the combo editor. (The combo editor's "pieces total" stops adding a required effect, since none can be required.)

## 6. Storefront

- **Product page.** One "Effect" group after the colourway, picked like a colourway: "None" first, then each effect with its small image, name and price ("Gold leaf +₹50"). One choice at a time. The total updates as today.
- **Combo pages.** The piece picker gets the same control.
- **Cart, wishlist, WhatsApp message.** Show the chosen effect names, as today.

## 7. Files touched

| Area | Files |
| --- | --- |
| Schema | `db/schema/finishes.ts`, `db/schema/cart.ts`, `db/schema/relations.ts`, new migration, `db/seed.ts` |
| Admin library | new `lib/admin/effects.ts` (save, reorder, delete), `lib/admin/queries/finishes.ts`, `lib/admin/schemas/catalogue.ts`, new `components/admin/catalogue/EffectsManager.tsx`, `app/(admin)/admin/(panel)/colours/page.tsx`, sidebar label in `AdminShell.tsx`, `lib/admin/media-cleanup.ts` |
| Admin finish | `lib/admin/finishes.ts`, `components/admin/catalogue/FinishEditor.tsx`, `FinishesList.tsx`, `lib/admin/settings.ts` |
| Admin combos | `lib/admin/queries/combos.ts`, `components/admin/combos/pricing.ts` |
| Storefront reads | `lib/data/types.ts`, `lib/data/catalogue.ts`, `lib/data/combos.ts` |
| Storefront UI | `components/product/choice.ts`, `ProductOptions.tsx`, `components/combos/model.ts`, `PiecePicker.tsx` |
| Cart | `lib/cart/rules.ts` (`checkEffects`), `actions.ts`, `read.ts`, `merge.ts`, `types.ts`, `contract.ts` |
| Tests | `lib/cart/rules.test.ts` |
| Caching | `lib/cache-tags.ts`, `lib/admin/catalogue-cache.ts`: saving an effect or a finish refreshes product and combo pages |
| Docs | `backend plan.md`: brief items 2 and 4, the finishes tables, the admin screens table |

## 8. Build order

1. **Schema and migration.** New tables, data copy, cart column swap, old tables dropped. Seed updated.
2. **Library screen.** Effects tab with image upload, add, edit, reorder, archive, delete.
3. **Finish editor.** Effects card with selling and cost price.
4. **Storefront and cart.** New reads, the picker on product and combo pages, server checks.
5. **Tests and a click-through:** add an effect with an image, add it to a finish with prices, add to cart as a guest, switch the effect off, confirm the cart flags the line.

Steps 1, 3 and 4 ship together, because the old tables go away in step 1.

## 9. Not included

- Ticking effects per product (a product gets whatever its finishes offer).
- Different effect prices per product.
- Stock or availability dates for effects.
