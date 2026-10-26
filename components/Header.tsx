"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import DesktopNav from "./DesktopNav";
import SideMenu from "./SideMenu";
import { demoCartCount } from "@/lib/account";
import { DESKTOP_NAV_MIN_WIDTH } from "@/lib/site";

const iconBtn = {
  background: "transparent",
  border: 0,
  color: "#F7F2EC",
  width: 44,
  height: 44,
  borderRadius: 22,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
} as const;

export default function Header() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  // If the window grows to desktop width while the side menu is open, close it:
  // the burger is hidden there and the desktop nav takes over.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_NAV_MIN_WIDTH}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <header style={{ background: "#32255D", color: "#F7F2EC", position: "sticky", top: 0, zIndex: 20 }}>
        {/* Mobile/tablet: burger · logo · icons. Desktop (≥1024px): logo · nav · icons. See .ih-header-row in globals.css. */}
        <div className="ih-header-row">
          <div className="ih-header-burger">
            <button
              ref={openerRef}
              className="ih-icon-btn ih-btn"
              onClick={() => setOpen(true)}
              aria-controls="ih-menu"
              aria-expanded={open}
              aria-label="Open menu"
              style={{
                background: "transparent",
                border: 0,
                color: "#F7F2EC",
                height: 44,
                padding: "0 12px",
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                <path d="M3 7h18M3 12h12M3 17h18" />
              </svg>
              <span className="ih-hide-sm">Shop</span>
            </button>
          </div>

          <Link href="/" aria-label="Innhand Creations home" className="ih-header-logo">
            <Image
              className="ih-logo"
              src="/assets/logo-word.png"
              alt="Innhand Creations"
              width={565}
              height={175}
              preload
              style={{ height: 50, width: "auto", display: "block" }}
            />
          </Link>

          <DesktopNav />

          <div className="ih-header-icons">
            <button className="ih-icon-btn ih-btn ih-hdr-icon" aria-label="Search" style={iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </button>
            <Link href="/account" className="ih-icon-btn ih-btn ih-hdr-icon" aria-label="My account" style={iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="8.5" r="3.8" />
                <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
              </svg>
            </Link>
            {/* Phones reach the wishlist from the account page and the menu instead. */}
            <Link href="/wishlist" className="ih-icon-btn ih-btn ih-hdr-icon ih-hide-sm" aria-label="Wishlist" style={iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />
              </svg>
            </Link>
            <Link
              href="/cart"
              className="ih-icon-btn ih-btn ih-hdr-icon"
              aria-label={`Cart, ${demoCartCount} items`}
              style={{ ...iconBtn, position: "relative" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
              </svg>
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 5,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: "#B52D6F",
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 500,
                  display: "grid",
                  placeItems: "center",
                  padding: "0 3px",
                  boxSizing: "border-box",
                }}
              >
                {demoCartCount}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <SideMenu open={open} onClose={close} />
    </>
  );
}
