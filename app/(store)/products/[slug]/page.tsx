import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ProductOptions from "@/components/product/ProductOptions";
import ProductPrice from "@/components/product/ProductPrice";
import WishButton from "@/components/product/WishButton";
import WishlistHeart from "@/components/product/WishlistHeart";
import { ProductChoiceProvider } from "@/components/product/ProductChoice";
import styles from "@/components/product/Product.module.css";
import { Eyebrow } from "@/components/ui";
import { getProduct, getProductSlugs, getSimilarProducts } from "@/lib/data/catalogue";
import { getSettings, whatsappUrl } from "@/lib/data/settings";

type Props = { params: Promise<{ slug: string }> };

// Every active product is prerendered; one added later renders on its first visit. Draft,
// archived and unknown slugs 404.
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "none" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: { absolute: product.seoTitle || `Innhand Creations — ${product.name}` },
    description: product.seoDescription || product.blurb || undefined,
  };
}

const promises = ["Hand-poured in small batches", "Custom colours on every piece", "No two pieces alike"];

const plus = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default function ProductPage({ params }: Props) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Suspense fallback={<div style={{ minHeight: "80vh" }} aria-busy="true" />}>
          <ProductContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function ProductContent({ params }: Props) {
  const { slug } = await params;
  const [product, settings, related] = await Promise.all([getProduct(slug), getSettings(), getSimilarProducts(slug)]);
  if (!product) notFound();
  const whatsapp = whatsappUrl(settings.whatsappNumber);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(product.category ? [{ label: product.category.name, href: product.category.href }] : []),
          { label: product.name },
        ]}
      />

      <ProductChoiceProvider product={product}>
        <div className={styles.layout}>
          <ProductGallery />

          <div className={styles.info}>
            <Eyebrow>{product.group}</Eyebrow>
            <h1 className={styles.title}>{product.name}</h1>
            <ProductPrice />
            <p className={styles.blurb}>{product.blurb}</p>

            <hr className={styles.rule} />

            <ProductOptions
              whatsappNumber={settings.whatsappNumber}
              maxQty={product.cartLimit ?? settings.defaultCartLimit}
              wish={
                // The heart reads this visitor's wishlist, so it streams in.
                <Suspense fallback={<WishButton productId={product.id} saved={false} />}>
                  <WishlistHeart productId={product.id} />
                </Suspense>
              }
            />

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
                  {product.description || product.blurb} Every piece is hand-poured in Jesmonite in small batches and
                  finished by hand, so yours will carry its own small variations in colour and pattern.
                </p>
              </details>
              <details className={styles.details}>
                <summary>
                  Size &amp; details
                  {plus}
                </summary>
                <p>
                  {product.sizeText && <>Size: {product.sizeText}. </>}Sizes vary slightly from piece to piece because
                  each one is made by hand.
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
                  <a href={whatsapp}>Chat with us on WhatsApp</a> and we will take it from there.
                </p>
              </details>
            </div>
          </div>
        </div>
      </ProductChoiceProvider>

      {related.length > 0 && (
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
      )}
    </>
  );
}
