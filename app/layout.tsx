import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Innhand Creations",
    template: "%s | Innhand Creations",
  },
  description:
    "Hand-poured Jesmonite décor and gifts, made in small batches and in the colours you choose.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
          <AnnouncementBar />
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
