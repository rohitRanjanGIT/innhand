export const WHATSAPP_URL = "https://wa.me/[NUMBER]";
export const CONTACT_EMAIL = "[email@innhandcreations.com]";

/** `highlight` marks a seasonal group (e.g. Diwali) to show in the accent colour. */
export type MenuGroup = { title: string; links: string[]; highlight?: boolean };
export type MenuSection = { heading: string; groups: MenuGroup[] };

export const menuSections: MenuSection[] = [
  {
    heading: "By Category",
    groups: [
      { title: "Home Décor", links: ["Planters", "Vases", "Tealight holders"] },
      { title: "Gifting", links: ["Trinket trays", "Jewellery boxes"] },
    ],
  },
  {
    heading: "By Occasion",
    groups: [
      { title: "Diwali Gifting", links: ["Candles with trays"], highlight: true },
      { title: "Housewarming", links: ["Planters", "Trays", "Candles"] },
      { title: "Corporate & Hotels", links: ["Test tube planters", "Coaster sets"] },
    ],
  },
];

export const categorySection = menuSections.find((s) => s.heading === "By Category")!;
export const occasionSection = menuSections.find((s) => s.heading === "By Occasion")!;

/** Plain links in the desktop navbar, after the Shop and Occasions dropdowns. */
export const navLinks = [
  { label: "Custom Orders", href: "/#custom" },
  { label: "Our Story", href: "/our-story" },
];

/** Below this width the header switches to the burger + side menu. Keep in sync with globals.css. */
export const DESKTOP_NAV_MIN_WIDTH = 1024;

export const footerShop =["Home Décor", "Gifting", "Diwali Gifting", "Housewarming", "Corporate & Hotels"];
