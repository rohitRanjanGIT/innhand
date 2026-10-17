import Link from "next/link";
import { DISPLAY, Eyebrow, PhotoTag } from "../ui";

export default function StoryTeaser() {
  return (
    <section style={{ background: "#EFE6DC", padding: "clamp(80px, 9vw, 140px) clamp(16px, 3vw, 40px)" }}>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap-reverse",
          gap: "clamp(32px, 6vw, 100px)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: "1 1 360px",
            minWidth: 0,
            aspectRatio: "4 / 5",
            maxHeight: 640,
            background: "#EBCFC8",
            borderRadius: "240px 240px 4px 4px",
            position: "relative",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" stroke="#32255D" strokeOpacity=".35" strokeWidth="1.2" aria-hidden="true">
            <path d="M58 150c0-30 10-50 24-62l6-34a8 8 0 0 1 16 2l-2 30 10-44a8 8 0 0 1 16 3l-8 42 14-34a8 8 0 0 1 15 6l-14 40c10 6 18 20 18 40 0 22-20 36-48 36s-47-10-47-25z" />
          </svg>
          <PhotoTag>Photo · Nisha in the studio</PhotoTag>
        </div>

        <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <Eyebrow>Our Story</Eyebrow>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(40px, 4.6vw, 68px)",
              lineHeight: 1.04,
            }}
          >
            Your idea. Our hands.
            <br />
            <em style={{ fontStyle: "italic" }}>One-of-a-kind décor.</em>
          </h2>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7, color: "#5F566B", maxWidth: 460 }}>
            Every piece is hand-poured and shaped around you: your colours, your space, your moment.
          </p>
          <Link
            href="/our-story"
            className="ih-link"
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#2A2238",
              borderBottom: "1px solid #2A2238",
              padding: "12px 0 8px",
            }}
          >
            Read our story
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M4 12h16M14 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
