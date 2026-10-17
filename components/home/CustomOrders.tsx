import { WHATSAPP_URL } from "@/lib/site";
import { ButtonLink, DISPLAY, Eyebrow } from "../ui";

export default function CustomOrders() {
  return (
    <section id="custom" style={{ padding: "0 clamp(16px, 3vw, 40px) clamp(80px, 9vw, 140px)" }}>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          background: "#EBCFC8",
          borderRadius: 4,
          padding: "clamp(40px, 6vw, 88px)",
          boxSizing: "border-box",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "1 1 420px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            position: "relative",
          }}
        >
          <Eyebrow color="#2A2238">Custom &amp; Bulk Orders</Eyebrow>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(36px, 4.2vw, 60px)",
              lineHeight: 1.05,
            }}
          >
            Gifting for your team, clients and guests,{" "}
            <em style={{ fontStyle: "italic" }}>made in your colours.</em>
          </h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: "#3E3550", maxWidth: 520 }}>
            Corporate gifting, hotels and festive orders. Tell us the occasion and quantity, and we will take it
            from there.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
          <ButtonLink
            href={WHATSAPP_URL}
            variant="dark"
            size="lg"
            style={{ justifyContent: "center", gap: 12, letterSpacing: "0.16em" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1z" />
              <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z" />
            </svg>
            Chat on WhatsApp
          </ButtonLink>
          <span style={{ fontSize: 13, color: "#3E3550", textAlign: "center" }}>
            For corporate enquiries &amp; gifting
          </span>
        </div>
      </div>
    </section>
  );
}
