export const WHATSAPP_URL = "https://wa.me/[NUMBER]";
export const CONTACT_EMAIL = "[email@innhandcreations.com]";

export type MenuGroup = { title: string; links: string[] };
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
      { title: "Diwali Gifting", links: ["Candles with trays"] },
      { title: "Housewarming", links: ["Planters", "Trays", "Candles"] },
      { title: "Corporate & Hotels", links: ["Test tube planters", "Coaster sets"] },
    ],
  },
];

export const footerShop = ["Home Décor", "Gifting", "Diwali Gifting", "Housewarming", "Corporate & Hotels"];
