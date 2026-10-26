import { products } from "@/lib/products";
import ProductCard from "../ProductCard";
import { ButtonLink, DISPLAY, Eyebrow } from "../ui";

// Four to a row on desktop; swap for a `featured` flag once there is real catalogue data.
const featured = products.slice(0, 4);

export default function FeaturedProducts() {
  return (
    <section style={{ padding: "clamp(40px, 5vw, 72px) clamp(16px, 3vw, 40px) clamp(80px, 9vw, 140px)" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Eyebrow>Featured</Eyebrow>
            <h2
              style={{
                margin: 0,
                fontFamily: DISPLAY,
                fontWeight: 300,
                fontSize: "clamp(36px, 4vw, 56px)",
                lineHeight: 1.05,
              }}
            >
              Hand-picked <em style={{ fontStyle: "italic" }}>favourites</em>
            </h2>
          </div>
          <ButtonLink href="/shop" variant="ghost" size="sm">
            View all products
          </ButtonLink>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
            gap: 28,
          }}
        >
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
