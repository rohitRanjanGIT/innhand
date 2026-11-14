# Innhand backend plan

Status (updated 2026-11-14): milestones 0–5 are built. Milestone 6 is partly done. Checked against the code and the migrations, and `npm test` passes (33 tests). The live app, R2, Resend and a deploy were not checked.

Scope of this phase: admin panel, catalogue, sign-in, cart and wishlist. Checkout, payment and orders come in the next phase.

## 0. Where the build differs from the draft

- **Sign-in is email + password only**, for shoppers and the admin. "Email me a code" sign-in, the admin's second-step code and Google are not built; they stay on the later list. Emailed 6-digit codes are used only to verify a new email and to reset a password. The code sign-in route is switched off in `lib/auth.ts` (`disabledPaths`).
- **`npm run build` uses webpack** (`next build --webpack`): Turbopack's production build fails on `next/font/google` in Next 16.4.2. `next dev` still uses Turbopack.
- **Seed:** every product gets all four finishes at today's catalogue price (not just one), so the product page keeps today's choices. Prices per finish are still yours to set in the admin.
- **Tags are shown as "Occasions"** in the admin (`/admin/occasions`). Migration `0001` added `bg_colour`, `sort` and `active` to the `tags` table for this.
- **`rate_limit` table** added for Better Auth's database-backed rate limiting.
- **Admin has light and dark mode** (`next-themes`).
- **`/checkout` exists** as a signed-in-only placeholder page. Payment and orders are not built.
- **Scripts:** `db:generate`, `db:migrate`, `db:studio`, `db:seed`, `db:admin` (creates or resets an admin; `--customer` makes a sample shopper), `test`.
- **Config:** `cacheComponents` and `partialPrefetching` are on; Server Actions body limit is 2 MB; `sharp` is an external server package; images use a custom loader (`lib/image-loader.ts`).

## 1. The brief

These are the requirements this plan is built on (your notes plus the answers you gave).

1. **Global finish limits.** One base colour per finish, always. The admin sets how many secondary colours a finish may have (SCC) and how many effects (SEC).
2. **Finishes.** Matte, Marble, Terrazzo and so on. Each finish has a base colour slot, up to SCC secondary colour slots and up to SEC effect slots. The admin names every slot ("Swirl colour", "Accent colour").
3. **Colourways.** The admin fills a finish's colour slots to make ready-made colour combinations. The shopper picks a colourway, not single colours.
4. **Effects.** An effect slot is a list the shopper picks one option from ("Flakes": Gold leaf, Silver leaf, None). An option can add to the price.
5. **Categories.** Two levels: head category (Home Décor) and sub-category (Planters, Vases).
6. **Navbar.** The admin builds the "By Category" and "By Occasion" menus.
7. **Products.** Name, description, size details, cart limit, sub-category, tags, hand-picked similar products, and a cost price only the admin sees. The admin chooses which finishes a product has. Each finish of a product has its own images and its own price. A product can be sold in sets (2, 3, 4, 5, 6…), each set size with its own price.
8. **Combos.** The admin makes combos of 2 to 4 catalogue products with their own photos and price, and the site shows the saving. The shopper can change the finish and colours of each piece; the price moves with the finishes and the saving stays. Shoppers can also build their own combo and get a discount the admin sets for 2, 3 and 4 pieces. The admin can turn the shopper-built option off.
9. **Cart and wishlist.** Anyone can add to cart. Signing in is required at checkout.
10. **Sign-in.** Email and password for now. Emailed codes verify a new email and reset a password. "Email me a code" sign-in and Google come later, then phone.
11. **Admin.** Owner only, one role.
12. **Stack.** Next.js (already here), Postgres on Neon for all data, Cloudflare R2 for all images (nothing else stores files), shadcn/ui for the admin screens.

## 2. Stack

| Need | Choice | Why |
| --- | --- | --- |
| Database | Neon Postgres | Given. |
| Data access | Drizzle ORM + drizzle-kit migrations | Typed, light, works well with Neon's serverless driver. |
| Driver | `@neondatabase/serverless` pooled (WebSocket) client | Saving a product or merging a cart needs real transactions, which the HTTP driver cannot do. Migrations use the direct (unpooled) URL. |
| Sign-in | Better Auth with its Drizzle adapter | Email and password now, with its email-code plugin for verification and password reset. Code sign-in, Google and phone are switched on later with no schema rewrite. |
| Email | Resend | Sends the verification and password-reset codes. Needs a verified sending domain. |
| Images | Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3` and `sharp` | The admin browser uploads the original straight to R2 with a presigned URL. A server step then makes the fixed-size WebP copies. R2 only stores files; it does not resize. |
| Admin UI | shadcn/ui on Tailwind v4, React Hook Form, Zod, TanStack Table, dnd-kit | shadcn as asked; the rest are what its forms, tables and drag-to-reorder are built on. |
| Validation | Zod, one schema shared by form and server | The server never trusts the form. |
| Tests | Vitest | For pricing and cart rules. |

Library APIs (Better Auth plugin names, the shadcn CLI, Tailwind v4 setup) are from memory and will be checked against current docs as each is installed. Next.js work follows `node_modules/next/dist/docs/`, as AGENTS.md requires.

### Image handling (R2 only)

R2 stores files and charges nothing for traffic leaving it, but it cannot resize on the fly. So the resizing happens once, at upload time:

1. **Upload.** The admin picks a photo. A Server Action (admin only, image types only, size capped) returns a presigned PUT URL, and the browser uploads the original straight to R2 under `originals/<id>`.
2. **Process.** A second admin Server Action reads the original from R2 and uses `sharp` to write four WebP copies: thumbnail (about 200 px wide), tile (600), gallery (1000) and zoom (1600). They go to `<id>/thumb.webp`, `tile.webp`, `gallery.webp`, `zoom.webp`. The original is kept so the sizes can be regenerated later.
3. **Store.** The `media` row holds the id, original width and height, size in bytes and alt text. No URLs.
4. **Serve.** Every URL is built in one file, `lib/images.ts`, from `R2_PUBLIC_URL` plus the id and size name. No component writes an image URL by hand. A small custom `next/image` loader picks the nearest of the four sizes, so Next's own optimiser is not used.
5. **Cache.** Each image id is unique and never overwritten, so files are served with a one-year immutable cache header. Replacing a photo creates a new id.
6. **Delete.** Removing a photo from a product deletes its R2 files only when no other product or combo uses it.

Bucket setup this needs: a custom domain on the bucket for public reads (the `r2.dev` address is rate limited and not meant for production), and a CORS rule allowing PUT from the admin's origin.

If the product photos from the catalogue are much larger than 1600 px, the zoom size is the cap; the original is never shown to shoppers.

### Sign-in

Shoppers and the admin sign in with email and password. Pages: `/sign-up`, `/sign-in`, `/verify-email`, `/forgot-password`, and `/admin/sign-in` for the admin.

| Flow | Steps |
| --- | --- |
| **Create account** | Name, email, password. We email a 6-digit code; entering it verifies the address and signs the shopper in. |
| **Sign in** | Email and password. An unverified account is sent a new code. |
| **Forgot password** | Email, then a 6-digit code, then a new password. Every other session of that account is signed out. |
| **Change password** | On the account page. |

**Later (not built):** a Password / Email code switch on the sign-in page, an admin second-step code, Google, phone. When wanted, remove `/sign-in/email-otp` from `disabledPaths` in `lib/auth.ts` and add the provider there.

Rules:

- **Email must be verified before a password account works.** Otherwise anyone could register with someone else's address and wait for them.
- **Passwords:** 8 characters minimum, no forced symbols. Stored only as a salted hash (Better Auth's default hashing), in its `account` table. Nobody, including the admin, can read one.
- **Codes:** six digits, expire in a few minutes, single use.
- **Rate limits:** on wrong passwords, wrong codes and code requests, per email and per IP.
- **One error message.** "Email or password is incorrect" whether the email exists or not, so the form cannot be used to find out who has an account.
- **Sessions:** http-only, secure cookie; the session itself lives in Neon. Signing out deletes it on the server.
- **After sign-in:** the guest cart and wishlist merge into the account and the shopper returns to where they were. Return addresses must be on our own site.
- **Admin:** email and password at `/admin/sign-in`. Only emails in `ADMIN_EMAILS` can hold the admin role. Create or reset one with `npm run db:admin -- <email> [--reset]`; it prints a random password once.
- **Guest cart merge:** runs when a session is created, and the sign-in forms also call `claimGuestCart()` as a backup. A merge failure never blocks signing in.
- **Google (later):** a "Continue with Google" button through Better Auth's Google provider. Needs an OAuth client in Google Cloud Console with the redirect address `/api/auth/callback/google`. A Google sign-in with the same email would link to the existing account.

### Next.js 16 points that shape the design

- **Two root layouts.** The storefront uses CSS modules and inline styles, and Tailwind's reset would disturb it. The app splits into `app/(store)/` (today's layout, untouched) and `app/(admin)/admin/` with its own root layout and its own stylesheet. Tailwind and shadcn load only in the admin. Moving between the two is a full page load, which is fine here.
- **`proxy.ts`, not `middleware.ts`.** It only does a quick cookie check to bounce signed-out visitors from `/admin`. The real check is in the server code (below).
- **Mutations are Server Actions.** Route Handlers are used only for the auth endpoints.
- **Caching.** Turn on `cacheComponents` (and `partialPrefetching`). Catalogue reads are cached with tags (`products`, `product:<slug>`, `categories`, `nav`, `finishes`, `combos`, `settings`). Admin saves call `updateTag` so the owner sees the change at once. Per-visitor parts (cart badge, wishlist hearts) render inside `Suspense`. This needs a pass over the existing pages, done in milestone 3.

## 3. Data model

Money is whole rupees stored as integers. Every table has `id`, `created_at`, `updated_at`. "Sort" means a number the admin controls by dragging.

### Settings

`store_settings`, a single row:

| Column | Meaning |
| --- | --- |
| `secondary_colour_count` | SCC |
| `effect_count` | SEC |
| `default_cart_limit` | Used when a product has no limit of its own |
| `custom_combos_enabled` | The shopper-built combo switch |
| `shipping_fee`, `free_shipping_from` | Today's 99 and 1500, moved out of code |
| `whatsapp_number`, `contact_email` | Replaces the placeholders in `lib/site.ts` |

Lowering SCC or SEC below what an existing finish uses is refused, with a list of the finishes in the way.

### Finishes and colours

| Table | Columns | Notes |
| --- | --- | --- |
| `colours` | name, hex, sort, active | The palette. Seeded with today's seven colours. |
| `finishes` | name, slug, description, sort, active | Matte, Marble… |
| `finish_colour_slots` | finish_id, position, label | Position 0 is the base colour and always exists. Positions 1..SCC are the named secondary slots. |
| `finish_effect_slots` | finish_id, position, label, required | Up to SEC per finish. |
| `finish_effect_options` | slot_id, name, extra_price, sort, active | "Gold leaf", +50. Extra price defaults to 0. |
| `colourways` | finish_id, name, sort, active | Name is auto-suggested ("Ivory + Plum swirl") and editable. |
| `colourway_colours` | colourway_id, slot_id, colour_id | One row per slot of that finish. |

A colourway belongs to a finish and is offered on every product that has the finish.

### Catalogue

| Table | Columns | Notes |
| --- | --- | --- |
| `media` | r2_key, width, height, bytes, alt | Every uploaded image. Key only, no URL (see Image handling). |
| `categories` | parent_id, name, slug, blurb, image_id, bg_colour, sort, active | `parent_id` empty means head category. Two levels only. |
| `tags` | name, slug, blurb, image_id | Used for occasions (Diwali, Housewarming), search and similar products. |
| `products` | slug, name, category_id, blurb, description, size_text, cart_limit, sold_in_sets, combo_eligible, status, featured_rank, seo_title, seo_description | `category_id` is the sub-category; the head category comes from its parent. Status: draft, active, archived. `featured_rank` replaces the hard-coded home page list. |
| `product_tags` | product_id, tag_id | |
| `product_finishes` | product_id, finish_id, sort, is_default, active | Which finishes this product comes in. |
| `product_finish_images` | product_finish_id, media_id, sort, colourway_id (optional) | The photos for that finish. If an image is linked to a colourway, picking that colourway shows it. |
| `product_variants` | product_finish_id, set_size, price, cost_price, active | The price grid: one row per finish per set size. A product not sold in sets has one row per finish with set size 1. Empty price means "price on request". |
| `product_related` | product_id, related_product_id, sort | Hand-picked similar products. |

Similar products shown on a product page: the hand-picked ones first, then same sub-category, then shared tags, then same head category, until there are four.

`cost_price` sits on the variant because a marble set of six costs more to make than a single matte piece. The form has a "copy to all" button so it can be typed once. It is never sent to the storefront.

### Navigation

| Table | Columns | Notes |
| --- | --- | --- |
| `nav_sections` | heading, mode, sort, active | "By Category", "By Occasion". Mode `categories` mirrors the category tree automatically; mode `manual` uses the two tables below. |
| `nav_groups` | section_id, title, highlight, sort | "Diwali Gifting" with the accent colour. |
| `nav_links` | group_id, label, target_type, target_id, url, sort | Target is a category, tag, product, combo or a typed URL. |

The header, side menu and footer all read from this.

### Combos

| Table | Columns | Notes |
| --- | --- | --- |
| `combos` | slug, name, description, discount_type, discount_value, status, sort | The admin's ready-made combos. |
| `combo_items` | combo_id, product_id, default_product_finish_id, default_set_size, sort | 2 to 4 rows. |
| `combo_images` | combo_id, media_id, sort | The combo's own photos. |
| `combo_discount_tiers` | item_count, discount_type, discount_value | Three rows (2, 3, 4) for shopper-built combos. |

Because the shopper can change finishes, a combo cannot store one fixed price. The admin types the combo price for the default finishes; we store the saving (as rupees or a percentage, the admin's choice). The form shows it live: "Pieces total ₹1,200. Combo price ₹1,000. Shopper saves ₹200." When the shopper switches a finish, the same saving is applied to the new total.

A combo hides itself while any of its products is not active or has no price.

### Shoppers, cart, wishlist

| Table | Columns | Notes |
| --- | --- | --- |
| `user`, `session`, `account`, `verification` | Created by Better Auth | `user` gains `role` (customer or admin), `phone`, `order_updates`, `offers`. |
| `addresses` | user_id, label, name, line1, line2, city, state, pin, phone, is_default | The account page already has this screen. |
| `carts` | user_id or guest_id, status | One active cart per owner. |
| `cart_bundles` | cart_id, kind, combo_id, qty | Kind: `combo` (admin's) or `custom` (shopper-built). |
| `cart_items` | cart_id, bundle_id (optional), variant_id, colourway_id, qty | A line is one variant in one colourway with one set of effects. |
| `cart_item_effects` | cart_item_id, effect_option_id | |
| `wishlist_items` | user_id or guest_id, product_id | |

**Guests.** The first time a visitor adds to cart or wishlist, a Server Action sets an http-only cookie holding a random id. That id is the `guest_id`. On sign-in, guest rows move to the user: matching lines add up (capped at the cart limit), wishlist duplicates drop, and the cookie is cleared. All in one transaction.

**Prices are never stored in the cart.** They are worked out on the server every time the cart is read, so an admin price change shows immediately. The order phase will snapshot them at purchase.

## 4. Pricing rules

One module, `lib/pricing.ts`, used by the product page, the cart and later checkout. It is the part that gets unit tests.

1. Line unit price = variant price + (sum of chosen effect extras × set size).
2. Line total = unit price × quantity.
3. Admin combo = sum of its lines − the combo's saving.
4. Shopper-built combo = sum of its lines − the tier discount for its piece count.
5. Percentage discounts round to the nearest rupee. A discount never takes a bundle below zero.
6. Subtotal = loose lines + bundles. Shipping comes from settings.
7. Listing tiles show the lowest active variant price, with "From" when there is more than one.
8. A product's quantity across all its cart lines cannot pass its cart limit.
9. If custom combos are switched off, or a combo is withdrawn, bundles already in carts lose the discount and the cart says so.

## 5. Admin panel

All under `/admin`, shadcn sidebar layout.

| Screen | What the owner does |
| --- | --- |
| Sign in | Email and password. Only emails in `ADMIN_EMAILS` get the admin role. |
| Dashboard | Counts of products, drafts, combos, shoppers, active carts. Orders arrive next phase. |
| Products | Table with search and filters. The editor has tabs: **Details** (name, slug, category, tags, description, size, cart limit, status), **Finishes and images** (tick finishes, upload and reorder photos per finish), **Pricing** (grid of finish × set size with price and cost price, margin shown), **Similar products**, **SEO**. |
| Categories | Head categories with their sub-categories, drag to reorder, image and blurb. |
| Occasions (tags) | List of occasions such as Diwali and Housewarming, with colour, order, active switch and the products in each. |
| Finishes | Global limits (SCC, SEC). Finish editor: slot names, effect slots and their options. Colourways per finish with a swatch preview. |
| Colours | The palette. |
| Combos | Combo editor (pick 2 to 4 products, default finishes, photos, price) plus the shopper-built switch and the three discount tiers. |
| Navigation | Sections, groups and links, drag to reorder. |
| Shoppers | Read-only list. |
| Settings | Shipping, contact details, default cart limit. |

Deleting is "archive" for anything a cart could point at (products, finishes, colourways, effect options), so carts never break.

## 6. Storefront changes

- `lib/products.ts` and `lib/account.ts` are replaced by server-only data functions in `lib/data/` that return only the fields the page needs.
- **Product page.** Options become: finish, colourway, each effect, set size, quantity. Gallery and price follow the choice. "Ask for a quote" stays for unpriced variants.
- **Shop and category pages** read from the database. New `/occasions/[slug]` pages list a tag's products.
- **Combos.** `/combos` lists them, `/combos/[slug]` lets the shopper adjust each piece, `/combos/build` is the shopper-built flow (only when switched on).
- **Header.** Menus from the navigation tables, live cart count.
- **Cart and wishlist** work for guests and signed-in shoppers. "Checkout" sends guests to sign-in and brings them back; the checkout page itself is next phase. "Order on WhatsApp" keeps working with the real cart.
- **Account.** Sign-in and sign-out, details and addresses are real. Orders shows an empty state until the next phase.

## 7. Security

- Every admin Server Action and admin data function starts with `requireAdmin()`, which reads the session from the database. The proxy redirect is a convenience, not the guard.
- Every action validates its input with Zod.
- Storefront data functions select named columns only, so `cost_price` cannot leak.
- R2 upload URLs are presigned per request, admin only, short-lived, limited to one key prefix, image types and a size cap. The R2 access key is scoped to this one bucket and is never sent to the browser.
- Sign-in, sign-up, code and password-change requests are rate limited (limits kept in the `rate_limit` table). Passwords are stored only as salted hashes.
- Secrets live in `.env.local` (already git-ignored) and in the host's environment settings.

## 8. Folder layout

```
app/
  (store)/            existing pages move here, layout unchanged
  (admin)/admin/      admin root layout, admin.css, all admin screens
  api/auth/[...all]/  Better Auth
db/
  schema/             one file per area (finishes, catalogue, nav, combos, cart, auth, settings, relations)
  migrations/         0000_init, 0001_occasion_options
  seed.ts  seed-data.json  create-admin.ts  index.ts
lib/
  data/               server-only reads for the storefront
  admin/              admin reads, Server Actions, schemas
  cart/               cart actions, rules and the guest cookie
  shopper/            account reads and actions
  auth.ts  auth-client.ts  session.ts  email.ts  pricing.ts  images.ts  image-loader.ts  r2.ts  cache-tags.ts  validation/
components/
  admin/              shadcn components and admin forms
proxy.ts
drizzle.config.ts  components.json  neon.ts
```

## 9. Milestones

Each one ends with something you can click through.

| # | Milestone | Delivers |
| --- | --- | --- |
| # | Milestone | Delivers | Status |
| --- | --- | --- | --- |
| 0 | Foundations | Packages, env, Neon + Drizzle, full schema and first migration, route-group split, Tailwind + shadcn in the admin only, Better Auth (email and password), admin guard, R2 upload component with the resize step. | Built |
| 1 | Catalogue setup screens | Settings, colours, finishes with slots, effects and colourways, categories, occasions (tags). | Built |
| 2 | Products | Product editor with finishes, images, price grid, sets, similar products. Seed script imports today's 21 products, 6 categories, 7 colours and 32 photos. | Built |
| 3 | Storefront on the database | Shop, category, occasion and product pages, home featured row, menus. Caching switched on. | Built |
| 4 | Sign-in, cart, wishlist | Shopper sign-up, sign-in, email verification, forgot password, change password, guest cart and wishlist, merge on sign-in, live header count, account details and addresses. | Built |
| 5 | Combos | Admin combos, combo pages, shopper-built combos, bundles in the cart. | Built |
| 6 | Finish | Pricing and cart tests, empty and error states, sitemap, deploy. | Partly: pricing and cart tests exist (33 passing). No sitemap, `not-found` or `error` pages found, and no deploy yet. |

Next phase, not in this plan: checkout, Razorpay, orders and order emails, email-code sign-in, Google and phone sign-in.

## 10. What I need from you

**Accounts and keys** (put them in `.env.local`; do not paste them in chat):

- Neon: pooled and direct connection strings.
- Cloudflare R2: account id, access key id, secret access key (scoped to the one bucket), bucket name, and the public URL of the bucket's custom domain.
- Resend: API key, and a domain you can add DNS records to for the sending address.
- The email address or addresses that should be admin.

**Content**, needed by milestone 2:

- For each product: which finishes it really comes in and the price of each. The seed gives every product all four finishes at today's catalogue price; you correct them in the admin.
- The real finishes with their slot names, and a first set of colourways.

**Decisions I made that you may want to change:**

1. Colourways are per finish and apply to every product with that finish. The alternative is choosing colourways product by product, which is more admin work.
2. Cost price is per finish and set size, not one number per product.
3. An effect's extra price is per piece, so it is multiplied by the set size.
4. The cart limit counts a product's total across all finishes in the cart.
5. Guests can use the wishlist too, not only the cart.
6. Combo saving is stored as a saving, not as a fixed price, because shoppers can change finishes.
7. Each product has a "can be used in shopper-built combos" switch, on by default.
8. Hosting is assumed to be Vercel.
9. The admin signs in with email and password only, the same as shoppers. A second-step code is deferred.
