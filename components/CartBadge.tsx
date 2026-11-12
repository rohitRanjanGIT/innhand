import Link from "next/link";

export const iconBtn = {
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

/** The header's cart icon. `count` is null while the visitor's cart is still loading. */
export default function CartBadge({ count }: { count: number | null }) {
  return (
    <Link
      href="/cart"
      className="ih-icon-btn ih-btn ih-hdr-icon"
      aria-label={count === null ? "Cart" : `Cart, ${count} ${count === 1 ? "item" : "items"}`}
      style={{ ...iconBtn, position: "relative" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      {!!count && (
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
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
