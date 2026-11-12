// Safe for client components (lib/data/settings.ts is server-only and re-exports this).

/** "+91 98765 43210" → https://wa.me/919876543210 ; empty number → the placeholder link. */
export function whatsappUrl(number: string, text?: string) {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits || "[NUMBER]"}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
