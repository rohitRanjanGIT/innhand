import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ProductOptions from "@/components/product/ProductOptions";
import styles from "@/components/product/Product.module.css";
import { Eyebrow } from "@/components/ui";
import { getCategory, getProduct, products } from "@/lib/products";
import { WHATSAPP_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// Only the products in the catalogue have pages; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  return {
    title: { absolute: `Innhand Creations — ${product.name}` },
    description: product.blurb,
  };
}

const promises = ["Hand-poured in small batches", "Custom colours on every piece", "No two pieces alike"];

const plus = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default async function ProductPage({ params }: Props) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const category = getCategory(product.categorySlug);
  // Pieces from the same category come first.
  const related = products
    .filter((p) => p.slug !== product.slug)
    .sort((a, b) => Number(b.categorySlug === product.categorySlug) - Number(a.categorySlug === product.categorySlug))
    .slice(0, 4);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            ...(category ? [{ label: category.name, href: category.href }] : []),
            { label: product.name },
          ]}
        />

        <div className={styles.layout}>
          <ProductGallery image={product.image} name={product.name} />

          <div className={styles.info}>
            <Eyebrow>{product.category}</Eyebrow>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.priceRow}>
              <span className={styles.price}>{product.price}</span>
              <span className={styles.note}>Made to order</span>
            </div>
            <p className={styles.blurb}>{product.blurb}</p>

            <hr className={styles.rule} />

            <ProductOptions name={product.name} />

            <ul className={styles.promises}>
              {promises.map((text) => (
                <li key={text}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B52D6F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5 10 17l9-10" />
                  </svg>
                  {text}
                </li>
              ))}
            </ul>

            <div>
              <details className={styles.details} open>
                <summary>
                  Description
                  {plus}
                </summary>
                <p>
                  {product.blurb} Every piece is hand-poured in Jesmonite in small batches and finished by hand, so
                  yours will carry its own small variations in colour and pattern.
                </p>
              </details>
              <details className={styles.details}>
                <summary>
                  Size &amp; details
                  {plus}
                </summary>
                <p>
                  Size: {product.size}. Sizes vary slightly from piece to piece because each one is made by hand.
                </p>
              </details>
              <details className={styles.details}>
                <summary>
                  Care
                  {plus}
                </summary>
                <p>
                  Wipe clean with a soft, damp cloth. Avoid harsh cleaners and abrasive sponges, and keep it out of the
                  dishwasher. Never leave a burning candle unattended.
                </p>
              </details>
              <details className={styles.details}>
                <summary>
                  Custom &amp; bulk orders
                  {plus}
                </summary>
                <p>
                  Need a colour that isn&apos;t listed, or a larger quantity for gifting?{" "}
                  <a href={WHATSAPP_URL}>Chat with us on WhatsApp</a> and we will take it from there.
                </p>
              </details>
            </div>
          </div>
        </div>

        <section className={styles.related} aria-labelledby="related-title">
          <h2 id="related-title" className={styles.relatedTitle}>
            You may also <em style={{ fontStyle: "italic" }}>like</em>
          </h2>
          <div className={styles.grid}>
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
