import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { DISPLAY } from "./ui";

/** Catalogue tile: image, category, name and a "View product" link. */
export default function ProductCard({ product: p }: { product: Product }) {
  return (
    <Link href={p.href} className="ih-tile">
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
  );
}
