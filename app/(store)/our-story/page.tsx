import type { Metadata } from "next";
import { WHATSAPP_URL } from "@/lib/site";
import { ButtonLink, DISPLAY, Eyebrow, PhotoTag } from "@/components/ui";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Our Story" },
};

const promises = [
  { n: "01", title: "Hand-poured", text: "Made in small batches, one piece at a time." },
  { n: "02", title: "Finished with care", text: "Every edge and surface is checked by hand." },
  { n: "03", title: "Made to be yours", text: "Your colour, your style, your occasion." },
];

const bandHeight = "clamp(320px, 38vw, 560px)";

export default function OurStoryPage() {
  return (
    <main>
      {/* Opening */}
      <section style={{ padding: "clamp(72px, 9vw, 140px) clamp(16px, 3vw, 40px) clamp(56px, 6vw, 96px)" }}>
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            textAlign: "center",
          }}
        >
          <Eyebrow>Our Story</Eyebrow>
          <h1
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(40px, 5.2vw, 76px)",
              lineHeight: 1.06,
              letterSpacing: "-0.01em",
            }}
          >
            It started with one belief:{" "}
            <em style={{ fontStyle: "italic" }}>when the customer smiles, the work is done.</em>
          </h1>
          <div style={{ width: 1, height: 64, background: "#2A2238", opacity: 0.35 }} />
        </div>
      </section>

      {/* Image band */}
      <section style={{ padding: "0 clamp(16px, 3vw, 40px)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div
            style={{
              flex: "1.6 1 420px",
              minWidth: 0,
              minHeight: bandHeight,
              background: "#EBCFC8",
              borderRadius: 4,
              position: "relative",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg width="220" height="220" viewBox="0 0 200 200" fill="none" stroke="#32255D" strokeOpacity=".35" strokeWidth="1.2" aria-hidden="true">
              <path d="M58 150c0-30 10-50 24-62l6-34a8 8 0 0 1 16 2l-2 30 10-44a8 8 0 0 1 16 3l-8 42 14-34a8 8 0 0 1 15 6l-14 40c10 6 18 20 18 40 0 22-20 36-48 36s-47-10-47-25z" />
            </svg>
            <PhotoTag>Photo · Nisha pouring a piece</PhotoTag>
          </div>
          <div
            style={{
              flex: "1 1 280px",
              minWidth: 0,
              minHeight: bandHeight,
              background: "#DCDFD1",
              borderRadius: 4,
              position: "relative",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none" stroke="#32255D" strokeOpacity=".35" strokeWidth="1.2" aria-hidden="true">
              <circle cx="54" cy="60" r="22" />
              <circle cx="106" cy="60" r="22" />
              <circle cx="54" cy="112" r="22" />
              <circle cx="106" cy="112" r="22" />
            </svg>
            <PhotoTag>Photo · Colour swatches in the studio</PhotoTag>
          </div>
        </div>
      </section>

      {/* Body */}
      <section style={{ padding: "clamp(72px, 9vw, 130px) clamp(16px, 3vw, 40px)" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(32px, 6vw, 96px)",
          }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontFamily: DISPLAY,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(28px, 2.8vw, 38px)",
                lineHeight: 1.25,
                color: "#32255D",
              }}
            >
              “I wish it came in this colour” becomes “It’s perfect!”
            </p>
          </div>
          <div
            style={{
              flex: "1.5 1 420px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              fontSize: 18,
              lineHeight: 1.8,
              color: "#3E3550",
            }}
          >
            <p style={{ margin: 0 }}>
              I’ve always loved making things personal, turning “I wish it came in this colour” into “It’s
              perfect!” That’s why Innhand Creations exists.
            </p>
            <p style={{ margin: 0 }}>
              We craft Jesmonite décor and gifts that make homes prettier and moments more memorable. Every piece
              is hand-poured in small batches and finished with care. No two are ever the same.
            </p>
            <p style={{ margin: 0, color: "#2A2238", fontWeight: 400 }}>
              Your colour, your style, your occasion. Tell us, and we’ll make it yours.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 18, paddingTop: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  background: "#E4C9B6",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: DISPLAY,
                  fontSize: 22,
                  color: "#32255D",
                }}
              >
                NM
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 26, color: "#2A2238" }}>Nisha Madhukar</span>
                <span style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "#5F566B" }}>
                  Founder
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promise strip */}
      <section
        style={{ background: "#32255D", color: "#F7F2EC", padding: "clamp(64px, 7vw, 110px) clamp(16px, 3vw, 40px)" }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            borderTop: "1px solid rgba(247,242,236,.22)",
          }}
        >
          {promises.map((p) => (
            <div
              key={p.n}
              style={{
                flex: "1 1 260px",
                minWidth: 0,
                padding: "32px 32px 0 0",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span style={{ fontFamily: DISPLAY, fontSize: 22, color: "#EBCFC8" }}>{p.n}</span>
              <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: 30 }}>{p.title}</h3>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "#D9D1E6" }}>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "clamp(72px, 9vw, 130px) clamp(16px, 3vw, 40px)" }}>
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(36px, 4.2vw, 60px)",
              lineHeight: 1.05,
            }}
          >
            Have something in mind? <em style={{ fontStyle: "italic" }}>Tell us.</em>
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, paddingTop: 8 }}>
            <ButtonLink href={WHATSAPP_URL} style={{ gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
                <path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1z" />
              </svg>
              Chat on WhatsApp
            </ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Shop the collection
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
