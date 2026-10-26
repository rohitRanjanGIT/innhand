import Image from "next/image";
import Link from "next/link";
import { categories } from "@/lib/products";
import { ButtonLink, DISPLAY, Eyebrow, PhotoTag } from "../ui";

export default function Categories() {
  return (
    <section style={{ padding: "clamp(40px, 5vw, 72px) clamp(16px, 3vw, 40px)" }}>
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
            <Eyebrow>Shop by category</Eyebrow>
            <h2
              style={{
                margin: 0,
                fontFamily: DISPLAY,
                fontWeight: 300,
                fontSize: "clamp(36px, 4vw, 56px)",
                lineHeight: 1.05,
              }}
            >
              Find your <em style={{ fontStyle: "italic" }}>piece</em>
            </h2>
          </div>
          <ButtonLink href="/shop" variant="ghost" size="sm">
            Browse all
          </ButtonLink>
        </div>

        <div className="ih-cat-grid">
          {categories.map((c) => (
            <Link key={c.name} href={c.href} className="ih-tile">
              <div className="ih-tile-media" style={{ aspectRatio: "4 / 5", background: c.bg }}>
                {c.image ? (
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 90vw, 260px"
                    unoptimized={c.image.endsWith(".svg")}
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <PhotoTag>[Photo]</PhotoTag>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 16 }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 1.15 }}>{c.name}</span>
                <span style={{ fontSize: 13, color: "#5F566B", letterSpacing: "0.04em" }}>{c.group}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
