import Image from "next/image";
import type { ReviewCard, HomeContent } from "@/lib/data/home";
import { ButtonLink, DISPLAY, Eyebrow } from "../ui";

function QuoteMark({ colour }: { colour: string }) {
  return (
    <svg width="32" height="24" viewBox="0 0 32 24" fill={colour} aria-hidden="true">
      <path d="M0 24V14C0 6 4 1 12 0l1 4c-4 1-6 4-6 8h6v12zM18 24V14c0-8 4-13 12-14l1 4c-4 1-6 4-6 8h6v12z" />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} style={{ color: "#B52D6F", letterSpacing: "0.12em", fontSize: 15 }}>
      {"★".repeat(rating)}
      <span style={{ color: "#E6DDD2" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/** "Asha, Pune" — whichever parts are filled in. */
function byline(r: ReviewCard) {
  return [r.customerName, r.location].filter(Boolean).join(", ");
}

function Review({ r }: { r: ReviewCard }) {
  const who = byline(r);
  const card = {
    margin: 0,
    minWidth: 0,
    background: "#FFFFFF",
    border: "1px solid #E6DDD2",
    borderRadius: 4,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
  } as const;

  // Photo or screenshot, with the quote and name underneath.
  if (r.image) {
    return (
      <figure style={card}>
        <div style={{ position: "relative", aspectRatio: "4 / 5", background: "#F7F2EC" }}>
          <Image
            src={r.image}
            alt={who ? `Review from ${who}` : "Customer review"}
            fill
            sizes="(max-width: 600px) 90vw, 380px"
            style={{ objectFit: "contain" }}
          />
        </div>
        {(r.quote || who || r.rating) && (
          <figcaption style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 24px 24px" }}>
            {r.rating ? <Stars rating={r.rating} /> : null}
            {r.quote && <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "#3E3550" }}>“{r.quote}”</blockquote>}
            {who && <span style={{ fontSize: 13, color: "#5F566B", letterSpacing: "0.04em" }}>{who}</span>}
          </figcaption>
        )}
      </figure>
    );
  }

  // Words only: the quote on a card, as in the original design.
  return (
    <figure style={{ ...card, aspectRatio: "4 / 5", justifyContent: "space-between", padding: 28 }}>
      <QuoteMark colour={r.accentColour} />
      <blockquote
        style={{
          margin: 0,
          fontFamily: DISPLAY,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(20px, 2vw, 26px)",
          lineHeight: 1.3,
          color: "#2A2238",
        }}
      >
        {r.quote}
      </blockquote>
      <figcaption style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {r.rating ? <Stars rating={r.rating} /> : null}
        {who && <span style={{ fontSize: 13, color: "#5F566B", letterSpacing: "0.04em" }}>{who}</span>}
      </figcaption>
    </figure>
  );
}

/** Nothing is shown until there is something to show: no placeholder cards on a live site. */
export default function Reviews({ section }: { section: HomeContent["reviews"] }) {
  const { cards, tiles, handle, ctaUrl: profileUrl } = section;
  if (!section.active || (cards.length === 0 && tiles.length === 0 && !handle)) return null;

  return (
    <section
      style={{
        padding: "clamp(80px, 9vw, 140px) clamp(16px, 3vw, 40px) clamp(56px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {section.eyebrow && <Eyebrow>{section.eyebrow}</Eyebrow>}
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(36px, 4vw, 56px)",
              lineHeight: 1.05,
            }}
          >
            {section.heading}
            {section.headingEmphasis && (
              <>
                {" "}
                <em style={{ fontStyle: "italic" }}>{section.headingEmphasis}</em>
              </>
            )}
          </h2>
        </div>

        {cards.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 380px))",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {cards.map((r) => (
              <Review key={r.id} r={r} />
            ))}
          </div>
        )}

        {handle && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              paddingTop: cards.length > 0 ? 48 : 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2A2238" strokeWidth="1.3" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.3" cy="6.7" r=".6" fill="#2A2238" />
              </svg>
              <span style={{ fontFamily: DISPLAY, fontSize: 28 }}>@{handle}</span>
            </div>
            {profileUrl && (
              <ButtonLink href={profileUrl} variant="ghost" size="sm">
                Follow on Instagram
              </ButtonLink>
            )}
          </div>
        )}

        {tiles.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))",
              gap: 12,
            }}
          >
            {tiles.map((t) => {
              const tile = (
                <div style={{ position: "relative", aspectRatio: "1", background: "#EFE6DC", borderRadius: 4, overflow: "hidden" }}>
                  <Image
                    src={t.image}
                    alt={t.caption}
                    fill
                    sizes="(max-width: 600px) 50vw, 220px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              );
              return t.link ? (
                <a key={t.id} href={t.link} target="_blank" rel="noopener noreferrer" aria-label={t.caption || "View on Instagram"}>
                  {tile}
                </a>
              ) : (
                <div key={t.id}>{tile}</div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
