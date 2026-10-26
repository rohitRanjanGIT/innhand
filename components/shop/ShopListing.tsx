import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import CustomOrders from "@/components/home/CustomOrders";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { categories, products, productsIn, type Category } from "@/lib/products";
import { WHATSAPP_URL } from "@/lib/site";
import styles from "./Shop.module.css";

/** The whole shop, or one category of it when `category` is given. */
export default function ShopListing({ category }: { category?: Category }) {
  const items = category ? productsIn(category.slug) : products;
  const chips = [{ name: "All pieces", href: "/shop", slug: "" }, ...categories];

  return (
    <main>
      <section className={styles.page}>
        <div className={styles.inner}>
          <Breadcrumbs
            items={
              category
                ? [{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]
                : [{ label: "Home", href: "/" }, { label: "Shop" }]
            }
          />

          <header className={styles.head}>
            <Eyebrow>{category ? category.group : "Shop"}</Eyebrow>
            <h1 className={styles.title}>
              {category ? category.name : <>All <em>pieces</em></>}
            </h1>
            <p className={styles.blurb}>
              {category ? category.blurb : "Every piece is hand-poured to order, in the colours you choose."}
            </p>
          </header>

          <div className={styles.bar}>
            <nav aria-label="Categories" className={styles.chipsWrap}>
              <ul className={styles.chips}>
                {chips.map((c) => {
                  const current = (category?.slug ?? "") === c.slug;
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
            <div className={styles.empty} style={{ background: category?.bg }}>
              <h2 className={styles.emptyTitle}>
                New {category?.name.toLowerCase()} are <em>on the way.</em>
              </h2>
              <p className={styles.emptyText}>
                Until they land, we can pour one to order for you, in your colours and finish.
              </p>
              <div className={styles.emptyActions}>
                <ButtonLink href={WHATSAPP_URL} variant="dark">
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
