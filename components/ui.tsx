import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const DISPLAY = "var(--font-display)";

export function Eyebrow({
  children,
  color = "#B52D6F",
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color,
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Small pill label that sits on top of placeholder imagery. */
export function PhotoTag({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        position: "absolute",
        left: 20,
        bottom: 20,
        background: "rgba(247,242,236,.9)",
        color: "#2A2238",
        fontSize: 12,
        letterSpacing: "0.06em",
        padding: "8px 14px",
        borderRadius: 16,
      }}
    >
      {children}
    </span>
  );
}

type Variant = "primary" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, { className: string; style: CSSProperties }> = {
  primary: {
    className: "ih-btn ih-btn-primary",
    style: { background: "#B52D6F", color: "#FFFFFF" },
  },
  ghost: {
    className: "ih-btn ih-btn-ghost",
    style: { background: "transparent", color: "#2A2238", border: "1px solid #2A2238", boxSizing: "border-box" },
  },
  dark: {
    className: "ih-btn ih-btn-primary",
    style: { background: "#32255D", color: "#F7F2EC" },
  },
};

const sizes: Record<Size, CSSProperties> = {
  sm: { padding: "0 26px", height: 48, borderRadius: 24 },
  md: { padding: "0 30px", height: 52, borderRadius: 26 },
  lg: { padding: "0 30px", height: 56, borderRadius: 28 },
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  children,
  style,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const v = variants[variant];
  const merged: CSSProperties = {
    textDecoration: "none",
    fontSize: 13,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    display: "inline-flex",
    alignItems: "center",
    ...v.style,
    ...sizes[size],
    ...style,
  };
  const external = /^https?:/.test(href);
  return external ? (
    <a href={href} className={v.className} style={merged}>
      {children}
    </a>
  ) : (
    <Link href={href} className={v.className} style={merged}>
      {children}
    </Link>
  );
}
