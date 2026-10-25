import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/products";
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
          <ButtonLink href="#" variant="ghost" size="sm">
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
            <Link key={p.name} href={p.href} className="ih-tile">
              <div className="ih-tile-media" style={{ aspectRatio: "3 / 4", background: "#FFFFFF" }}>
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 90vw, 320px"
                  unoptimized={p.image.endsWith(".svg")}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 18 }}>
                <span style={{ fontSize: 13, color: "#5F566B", letterSpacing: "0.04em" }}>{p.category}</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 1.15 }}>{p.name}</span>
                <span className="ih-tile-link">
                  View product
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 12h16M14 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
