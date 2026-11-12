// What is still static on the storefront. Menus come from the nav tables (lib/data/nav.ts) and the
// WhatsApp number and contact email from store settings (lib/data/settings.ts).

/** Plain links in the desktop navbar, after the Shop and Occasions dropdowns. */
export const navLinks = [
  { label: "Custom Orders", href: "/#custom" },
  { label: "Our Story", href: "/our-story" },
];

/** Below this width the header switches to the burger + side menu. Keep in sync with globals.css. */
export const DESKTOP_NAV_MIN_WIDTH = 1024;
