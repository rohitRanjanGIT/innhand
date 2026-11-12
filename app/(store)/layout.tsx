import type { Metadata } from "next";
import { Suspense } from "react";
import { cormorant, jost } from "@/lib/fonts";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartBadge from "@/components/CartBadge";
import CartLink from "@/components/CartLink";
import { getNav } from "@/lib/data/nav";


export const metadata: Metadata = {
  title: {
    default: "Innhand Creations",
    template: "%s | Innhand Creations",
  },
  description:
    "Hand-poured Jesmonite décor and gifts, made in small batches and in the colours you choose.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Menus are cached catalogue data, so they are part of the static shell. The cart count reads
  // the visitor's session or guest cookie, so it streams in behind Suspense.
  const nav = await getNav();
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 300,
            color: "#2A2238",
            background: "#F7F2EC",
            minHeight: "100vh",
          }}
        >
          <Header
            nav={nav}
            cartLink={
              <Suspense fallback={<CartBadge count={null} />}>
                <CartLink />
              </Suspense>
            }
          />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
