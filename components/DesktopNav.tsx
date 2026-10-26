"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent as ReactPointerEvent } from "react";
import { DISPLAY } from "./ui";
import { shopHref } from "@/lib/products";
import { categorySection, navLinks, occasionSection, type MenuGroup } from "@/lib/site";

type MenuId = "shop" | "occasions";

const CLOSE_DELAY_MS = 140;

function Chevron() {
  return (
    <svg className="ih-nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FestiveTag() {
  return (
    <span
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 500,
        color: "#FFFFFF",
        background: "#B52D6F",
        borderRadius: 10,
        padding: "3px 8px",
        lineHeight: 1,
      }}
    >
      Festive
    </span>
  );
}

function GroupLinks({ group, size, onNavigate }: { group: MenuGroup; size: number; onNavigate: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Link
        className="ih-link"
        href={shopHref(group.title)}
        onClick={onNavigate}
        style={{
          fontFamily: DISPLAY,
          fontSize: size,
          lineHeight: 1.15,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          color: group.highlight ? "#B52D6F" : undefined,
        }}
      >
        {group.title}
        {group.highlight && <FestiveTag />}
      </Link>
      <ul style={{ listStyle: "none", margin: 0, padding: "0 0 0 14px", borderLeft: "1px solid #DCD2C6", display: "flex", flexDirection: "column", gap: 6 }}>
        {group.links.map((label) => (
          <li key={label}>
            <Link className="ih-link" href={shopHref(label)} onClick={onNavigate} style={{ fontSize: 15 }}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const columnHeading = {
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#B52D6F",
  fontWeight: 500,
} as const;

export default function DesktopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Partial<Record<MenuId, HTMLButtonElement | null>>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverOpenedAt = useRef(0);

  const cancelClose = () => clearTimeout(closeTimer.current);
  const close = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(null);
  }, []);

  // Close when the route changes.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Escape closes and returns focus to the trigger; a press outside closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      triggerRefs.current[open]?.focus();
      close();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Mouse hover opens instantly and closes after a short grace period;
  // touch and keyboard use the button click instead.
  const hoverProps = (id: MenuId) => ({
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelClose();
      if (open !== id) hoverOpenedAt.current = Date.now();
      setOpen(id);
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelClose();
      closeTimer.current = setTimeout(() => setOpen((cur) => (cur === id ? null : cur)), CLOSE_DELAY_MS);
    },
    onBlur: (e: FocusEvent<HTMLLIElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setOpen((cur) => (cur === id ? null : cur));
      }
    },
  });

  const toggle = (id: MenuId) => {
    cancelClose();
    // A click right after hover-open should not immediately close the menu.
    const justHovered = Date.now() - hoverOpenedAt.current < 600;
    setOpen((cur) => (cur === id && !justHovered ? null : id));
  };

  const trigger = (id: MenuId, label: string) => (
    <button
      ref={(el) => {
        triggerRefs.current[id] = el;
      }}
      type="button"
      className="ih-nav-top"
      aria-expanded={open === id}
      aria-controls={`ih-nav-${id}`}
      data-open={open === id || undefined}
      onClick={() => toggle(id)}
    >
      {label}
      <Chevron />
    </button>
  );

  return (
    <nav ref={navRef} className="ih-desktop-nav" aria-label="Main">
      <ul className="ih-nav-list">
        {/* Shop: full-width mega panel anchored to the header */}
        <li className="ih-nav-item ih-nav-item--mega" {...hoverProps("shop")}>
          {trigger("shop", "Shop")}
          <div id="ih-nav-shop" className="ih-nav-panel ih-nav-mega" data-open={open === "shop" || undefined}>
            <div
              style={{
                maxWidth: 1320,
                margin: "0 auto",
                padding: "40px clamp(16px, 3vw, 40px) 48px",
                boxSizing: "border-box",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.1fr)",
                gap: 48,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <span style={columnHeading}>{categorySection.heading}</span>
                {categorySection.groups.map((g) => (
                  <GroupLinks key={g.title} group={g} size={24} onNavigate={close} />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <span style={columnHeading}>{occasionSection.heading}</span>
                {occasionSection.groups.map((g) => (
                  <GroupLinks key={g.title} group={g} size={24} onNavigate={close} />
                ))}
              </div>
              <div
                style={{
                  background: "#EBCFC8",
                  borderRadius: 4,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 24,
                  minHeight: 260,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <span style={{ ...columnHeading, color: "#2A2238" }}>Made to order</span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 300, lineHeight: 1.15, color: "#2A2238" }}>
                    Your colour, your style, <em>your occasion.</em>
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
                  <Link
                    href="/#custom"
                    onClick={close}
                    className="ih-btn ih-btn-primary"
                    style={{
                      background: "#32255D",
                      color: "#F7F2EC",
                      textDecoration: "none",
                      fontSize: 12,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      padding: "0 24px",
                      height: 46,
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 23,
                    }}
                  >
                    Start a custom order
                  </Link>
                  <Link className="ih-link" href="/shop" onClick={close} style={{ fontSize: 14, borderBottom: "1px solid currentColor", paddingBottom: 2 }}>
                    View all pieces
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </li>

        {/* Occasions: compact dropdown under its trigger */}
        <li className="ih-nav-item" {...hoverProps("occasions")}>
          {trigger("occasions", "Occasions")}
          <div id="ih-nav-occasions" className="ih-nav-panel ih-nav-dropdown" data-open={open === "occasions" || undefined}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {occasionSection.groups.map((g) => (
                <GroupLinks key={g.title} group={g} size={22} onNavigate={close} />
              ))}
            </div>
          </div>
        </li>

        {navLinks.map((link) => {
          const current = link.href === pathname;
          return (
            <li key={link.href} className="ih-nav-item">
              <Link href={link.href} className="ih-nav-top" aria-current={current ? "page" : undefined} onClick={close}>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
