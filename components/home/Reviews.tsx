import { ButtonLink, DISPLAY, Eyebrow } from "../ui";

const reviews = [
  { label: "[Customer review screenshot 1]", quote: "#D7A49A" },
  { label: "[Customer review screenshot 2]", quote: "#B6BBA3" },
  { label: "[Customer review screenshot 3]", quote: "#A4B1BA" },
];

const posts = [
  { label: "[Post 1]", bg: "#EBCFC8" },
  { label: "[Post 2]", bg: "#DCDFD1" },
  { label: "[Post 3]", bg: "#D3DAE0" },
  { label: "[Post 4]", bg: "#EFE6DC" },
  { label: "[Post 5]", bg: "#E4C9B6" },
  { label: "[Post 6]", bg: "#E1DAD3" },
];

export default function Reviews() {
  return (
    <section
      style={{
        padding: "clamp(80px, 9vw, 140px) clamp(16px, 3vw, 40px) clamp(56px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Eyebrow>Reviews</Eyebrow>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(36px, 4vw, 56px)",
              lineHeight: 1.05,
            }}
          >
            Kind words, <em style={{ fontStyle: "italic" }}>in their homes</em>
          </h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {reviews.map((r) => (
            <figure
              key={r.label}
              style={{
                margin: 0,
                flex: "1 1 280px",
                minWidth: 0,
                aspectRatio: "4 / 5",
                background: "#FFFFFF",
                border: "1px solid #E6DDD2",
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 28,
                boxSizing: "border-box",
              }}
            >
              <svg width="32" height="24" viewBox="0 0 32 24" fill={r.quote} aria-hidden="true">
                <path d="M0 24V14C0 6 4 1 12 0l1 4c-4 1-6 4-6 8h6v12zM18 24V14c0-8 4-13 12-14l1 4c-4 1-6 4-6 8h6v12z" />
              </svg>
              <span style={{ fontSize: 13, color: "#5F566B", letterSpacing: "0.04em" }}>{r.label}</span>
            </figure>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            paddingTop: 48,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2A2238" strokeWidth="1.3" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.3" cy="6.7" r=".6" fill="#2A2238" />
            </svg>
            <span style={{ fontFamily: DISPLAY, fontSize: 28 }}>@[instagram handle]</span>
          </div>
          <ButtonLink href="#" variant="ghost" size="sm">
            Follow on Instagram
          </ButtonLink>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))",
            gap: 12,
          }}
        >
          {posts.map((p) => (
            <div
              key={p.label}
              style={{
                aspectRatio: "1",
                background: p.bg,
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                color: "#2A2238",
              }}
            >
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
