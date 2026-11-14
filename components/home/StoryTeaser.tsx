import Image from "next/image";
import Link from "next/link";
import type { HomeSection } from "@/lib/data/home";
import { DISPLAY, Eyebrow, PhotoTag } from "../ui";

export default function StoryTeaser({ section }: { section: HomeSection }) {
  if (!section.active) return null;
  const { eyebrow, heading, headingEmphasis, body, ctaLabel, ctaUrl, image } = section;

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
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 800px) 90vw, 520px"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <>
              {/* Nothing uploaded yet: the original placeholder. */}
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none" stroke="#32255D" strokeOpacity=".35" strokeWidth="1.2" aria-hidden="true">
                <path d="M58 150c0-30 10-50 24-62l6-34a8 8 0 0 1 16 2l-2 30 10-44a8 8 0 0 1 16 3l-8 42 14-34a8 8 0 0 1 15 6l-14 40c10 6 18 20 18 40 0 22-20 36-48 36s-47-10-47-25z" />
              </svg>
              <PhotoTag>Photo · Nisha in the studio</PhotoTag>
            </>
          )}
        </div>

        <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(40px, 4.6vw, 68px)",
              lineHeight: 1.04,
            }}
          >
            {heading}
            {headingEmphasis && (
              <>
                <br />
                <em style={{ fontStyle: "italic" }}>{headingEmphasis}</em>
              </>
            )}
          </h2>
          {body && <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7, color: "#5F566B", maxWidth: 460 }}>{body}</p>}
          {ctaLabel && ctaUrl && (
            <Link
              href={ctaUrl}
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
              {ctaLabel}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                <path d="M4 12h16M14 6l6 6-6 6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
