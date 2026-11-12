"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import DesktopNav from "./DesktopNav";
import SideMenu from "./SideMenu";
import { iconBtn } from "./CartBadge";
import { DESKTOP_NAV_MIN_WIDTH } from "@/lib/site";
import type { MenuSection } from "@/lib/data/types";

/** `cartLink` is rendered by the layout (it reads the visitor's cart inside a Suspense boundary). */
export default function Header({ nav, cartLink }: { nav: MenuSection[]; cartLink: ReactNode }) {
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

          <DesktopNav nav={nav} />

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
            {cartLink}
          </div>
        </div>
      </header>

      <SideMenu nav={nav} open={open} onClose={close} />
    </>
  );
}
