import Image from "next/image";
import type { HomeSection } from "@/lib/data/home";
import { DISPLAY, Eyebrow, PhotoTag } from "../ui";
import ProcessVideo from "./ProcessVideo";

export default function MadeByHand({ section }: { section: HomeSection }) {
  if (!section.active) return null;
  const { eyebrow, heading, headingEmphasis, body, steps, video, image } = section;

  return (
    <section style={{ padding: "clamp(80px, 9vw, 140px) clamp(16px, 3vw, 40px)" }}>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(32px, 5vw, 80px)",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(40px, 4.4vw, 64px)",
              lineHeight: 1.05,
            }}
          >
            {heading}
            {headingEmphasis && (
              <>
                {" "}
                <em style={{ fontStyle: "italic" }}>{headingEmphasis}</em>
              </>
            )}
          </h2>
          {body && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: "#5F566B", maxWidth: 400 }}>{body}</p>}
          {steps.length > 0 && (
            <div style={{ display: "flex", gap: 28, paddingTop: 12, flexWrap: "wrap" }}>
              {steps.map((label, i) => (
                <div key={`${i}-${label}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: DISPLAY, fontSize: 28 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5F566B" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            flex: "1.7 1 520px",
            minWidth: 0,
            aspectRatio: "16 / 9",
            background: "#DCDFD1",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          {video ? (
            <ProcessVideo video={video} poster={image} />
          ) : image ? (
            <Image src={image} alt="" fill sizes="(max-width: 900px) 100vw, 780px" style={{ objectFit: "cover" }} />
          ) : (
            <>
              {/* Nothing uploaded yet: the original placeholder. */}
              <button
                aria-label="Play the making-of video"
                className="ih-btn"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  border: "1px solid rgba(42,34,56,.5)",
                  background: "rgba(247,242,236,.85)",
                  color: "#2A2238",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </button>
              <PhotoTag>Video · 15s · pouring &amp; demoulding</PhotoTag>
              <span
                style={{
                  position: "absolute",
                  right: 20,
                  top: 20,
                  color: "#2A2238",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                0:15
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
