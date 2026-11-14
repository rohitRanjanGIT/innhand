// The home page copy as it was before it became editable. Used wherever a section has no saved row,
// so the storefront looks the same until the owner changes something. No server-only imports:
// the admin forms and the storefront both read this.
import type { HomeSectionKey } from "@/db/schema/content";

export type SectionContent = {
  eyebrow: string;
  heading: string;
  headingEmphasis: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Instagram handle without the @. Reviews section only. */
  handle: string;
  steps: string[];
  active: boolean;
};

export const SECTION_DEFAULTS: Record<HomeSectionKey, SectionContent> = {
  process: {
    eyebrow: "The process",
    heading: "Made by",
    headingEmphasis: "Hand",
    body: "Watch a piece come to life. Poured, set and demoulded by hand, one at a time.",
    ctaLabel: "",
    ctaUrl: "",
    handle: "",
    steps: ["Pour", "Set", "Demould"],
    active: true,
  },
  story: {
    eyebrow: "Our Story",
    heading: "Your idea. Our hands.",
    headingEmphasis: "One-of-a-kind décor.",
    body: "Every piece is hand-poured and shaped around you: your colours, your space, your moment.",
    ctaLabel: "Read our story",
    ctaUrl: "/our-story",
    handle: "",
    steps: [],
    active: true,
  },
  reviews: {
    eyebrow: "Reviews",
    heading: "Kind words,",
    headingEmphasis: "in their homes",
    body: "",
    ctaLabel: "",
    /** The Instagram profile link. */
    ctaUrl: "",
    handle: "",
    steps: [],
    active: true,
  },
};

/** The colour a text-only review's quote mark starts with (the three the design used). */
export const REVIEW_ACCENTS = ["#D7A49A", "#B6BBA3", "#A4B1BA"] as const;

export const MAX_STEPS = 6;
