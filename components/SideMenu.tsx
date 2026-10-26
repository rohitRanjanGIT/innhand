"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { DISPLAY } from "./ui";
import { shopHref } from "@/lib/products";
import { menuSections } from "@/lib/site";

const groupTitle = { fontFamily: DISPLAY, fontSize: 24 } as const;
const subLinks = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  paddingLeft: 14,
  borderLeft: "1px solid #DCD2C6",
} as const;

export default function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div id="ih-menu">
      <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
        <nav
          aria-label="Shop menu"
          style={{
            width: "min(400px, 88vw)",
            height: "100%",
            overflowY: "auto",
            background: "#F7F2EC",
            boxShadow: "24px 0 60px rgba(42,34,56,.18)",
            padding: "28px 32px 40px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "#5F566B" }}>
              Menu
            </span>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close menu"
              className="ih-btn"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                border: "1px solid #D9CFC3",
                background: "transparent",
                color: "#2A2238",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 400, lineHeight: 1.1 }}>Shop</span>
            <Link className="ih-link" href="/shop" onClick={onClose} style={{ fontSize: 14, color: "#5F566B" }}>
              View all pieces
            </Link>
          </div>

          {menuSections.map((section, i) => (
            <div key={section.heading} style={{ display: "contents" }}>
              {i > 0 && <div style={{ height: 1, background: "#E2D9CE" }} />}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <span style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#B52D6F", fontWeight: 500 }}>
                  {section.heading}
                </span>
                {section.groups.map((group) => (
                  <div key={group.title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Link className="ih-link" href={shopHref(group.title)} onClick={onClose} style={groupTitle}>
                      {group.title}
                    </Link>
                    <div style={subLinks}>
                      {group.links.map((label) => (
                        <Link key={label} className="ih-link" href={shopHref(label)} onClick={onClose} style={{ fontSize: 15 }}>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ height: 1, background: "#E2D9CE" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link className="ih-link" href="/account" onClick={onClose} style={{ fontSize: 15 }}>
              My Account
            </Link>
            <Link className="ih-link" href="/wishlist" onClick={onClose} style={{ fontSize: 15 }}>
              Wishlist
            </Link>
            <Link className="ih-link" href="/our-story" onClick={onClose} style={{ fontSize: 15 }}>
              Our Story
            </Link>
            <Link className="ih-link" href="/#custom" onClick={onClose} style={{ fontSize: 15 }}>
              Custom &amp; Bulk Orders
            </Link>
            <Link className="ih-link" href="#footer" onClick={onClose} style={{ fontSize: 15 }}>
              Contact Us
            </Link>
          </div>
        </nav>
        <button
          onClick={onClose}
          aria-label="Close menu"
          style={{ flex: 1, border: 0, background: "rgba(42,34,56,.42)", cursor: "pointer" }}
        />
      </div>
    </div>
  );
}
