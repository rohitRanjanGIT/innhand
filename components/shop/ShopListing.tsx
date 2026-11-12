import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import CustomOrders from "@/components/home/CustomOrders";
import { ButtonLink, Eyebrow } from "@/components/ui";
import {
  getCategory,
  getProductsInCategory,
  getProductsWithTag,
  getProductTiles,
  getSubCategories,
} from "@/lib/data/catalogue";
import { getSettings, whatsappUrl } from "@/lib/data/settings";
import type { Occasion } from "@/lib/data/types";
import styles from "./Shop.module.css";

type Category = NonNullable<Awaited<ReturnType<typeof getCategory>>>;

/**
 * The whole shop, one category of it (a head category lists all its sub-categories' pieces), or
 * one occasion's pieces.
 */
export default async function ShopListing({ category, occasion }: { category?: Category; occasion?: Occasion }) {
  const [items, subCategories, settings] = await Promise.all([
    category ? getProductsInCategory(category.id) : occasion ? getProductsWithTag(occasion.id) : getProductTiles(),
    getSubCategories(),
    getSettings(),
  ]);
  const chips = [{ name: "All pieces", href: "/shop", slug: "" }, ...subCategories];
  const currentSlug = category?.slug ?? (occasion ? null : "");
  const name = category?.name ?? occasion?.name;

  const crumbs = category
    ? [
        { label: "Home", href: "/" },
        { label: "Shop", href: "/shop" },
        ...(category.parent ? [{ label: category.parent.name, href: category.parent.href }] : []),
        { label: category.name },
      ]
    : occasion
      ? [{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: occasion.name }]
      : [{ label: "Home", href: "/" }, { label: "Shop" }];

  return (
    <main>
      <section className={styles.page}>
        <div className={styles.inner}>
          <Breadcrumbs items={crumbs} />

          <header className={styles.head}>
            <Eyebrow>{category ? (category.parent ? category.parent.name : "Shop") : occasion ? "Occasion" : "Shop"}</Eyebrow>
            <h1 className={styles.title}>
              {name ?? (
                <>
                  All <em>pieces</em>
                </>
              )}
            </h1>
            <p className={styles.blurb}>
              {category?.blurb || occasion?.blurb || "Every piece is hand-poured to order, in the colours you choose."}
            </p>
          </header>

          <div className={styles.bar}>
            <nav aria-label="Categories" className={styles.chipsWrap}>
              <ul className={styles.chips}>
                {chips.map((c) => {
                  const current = currentSlug === c.slug;
                  return (
                    <li key={c.href}>
                      <Link href={c.href} className={styles.chip} aria-current={current ? "page" : undefined}>
                        {c.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <span className={styles.count}>
              {items.length} {items.length === 1 ? "piece" : "pieces"}
            </span>
          </div>

          {items.length > 0 ? (
            <div className={styles.grid}>
              {items.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          ) : (
            <div className={styles.empty} style={{ background: category?.bgColour }}>
              <h2 className={styles.emptyTitle}>
                {name ? <>New {name.toLowerCase()} pieces are </> : <>New pieces are </>}
                <em>on the way.</em>
              </h2>
              <p className={styles.emptyText}>
                Until they land, we can pour one to order for you, in your colours and finish.
              </p>
              <div className={styles.emptyActions}>
                <ButtonLink href={whatsappUrl(settings.whatsappNumber)} variant="dark">
                  Ask for a custom piece
                </ButtonLink>
                <ButtonLink href="/shop" variant="ghost">
                  Browse all pieces
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </section>

      <CustomOrders />
    </main>
  );
}

/** Shown while a category or occasion that wasn't prerendered streams in. */
export function ListingFallback() {
  return (
    <main>
      <section className={styles.page} aria-busy="true">
        <div className={styles.inner} style={{ minHeight: "70vh" }} />
      </section>
    </main>
  );
}
