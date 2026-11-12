import Image from "next/image";
import Link from "next/link";
import { getNav } from "@/lib/data/nav";
import { getSettings, whatsappUrl } from "@/lib/data/settings";

const colTitle = {
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#EBCFC8",
  paddingBottom: 6,
} as const;

const col = (basis: number) =>
  ({ flex: `0 1 ${basis}px`, display: "flex", flexDirection: "column", gap: 12, fontSize: 15 }) as const;

export default async function Footer() {
  const [nav, settings] = await Promise.all([getNav(), getSettings()]);
  // The Shop column lists every menu group (head categories, then occasions).
  const shopLinks = nav.flatMap((s) => s.groups.map((g) => ({ label: g.title, href: g.href })));

  return (
    <footer
      id="footer"
      className="ih-foot"
      style={{
        background: "#32255D",
        color: "#F7F2EC",
        padding: "clamp(64px, 7vw, 100px) clamp(16px, 3vw, 40px) 32px",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 56 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 48, justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <Image
              src="/assets/logo-lockup.png"
              alt="Innhand Creations — You choose, we create!"
              width={565}
              height={425}
              style={{ width: 220, height: "auto", display: "block" }}
            />
          </div>

          <nav aria-label="Shop" style={col(180)}>
            <span style={colTitle}>Shop</span>
            {shopLinks.map((l) => (
              <Link key={`${l.label}-${l.href}`} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Help" style={col(200)}>
            <span style={colTitle}>Help</span>
            <Link href="#">Contact Us</Link>
            <Link href="#">Returns &amp; Exchanges</Link>
            <Link href="#">Shipping Policy</Link>
            <Link href="/#custom">Custom &amp; Bulk Orders</Link>
          </nav>

          <nav aria-label="Brand" style={col(180)}>
            <span style={colTitle}>Innhand</span>
            <Link href="/our-story">Our Story</Link>
            <Link href="#">Instagram</Link>
            <a href={whatsappUrl(settings.whatsappNumber)}>WhatsApp</a>
          </nav>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(247,242,236,.18)",
            paddingTop: 24,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            color: "#CFC6DE",
          }}
        >
          <span>© 2026 Innhand Creations. Handmade with care.</span>
          {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
        </div>
      </div>
    </footer>
  );
}
