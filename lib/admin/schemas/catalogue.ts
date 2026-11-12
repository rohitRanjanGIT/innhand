// Zod schemas shared by the catalogue setup forms (client-side check) and their Server Actions
// (the real check). Plain module: no "use server", no server-only imports.
import { z } from "zod";

const id = z.uuid();
const name = (label = "Name", max = 120) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);
const slug = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only have lower-case letters, numbers and dashes.");
const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #A1B2C3.")
  .transform((s) => s.toUpperCase());
const rupees = (label: string) =>
  z.number({ message: `${label} must be a number.` }).int(`${label} must be whole rupees.`).min(0, `${label} can't be negative.`).max(10_000_000);

export const idsSchema = z.object({ ids: z.array(id).min(1).max(1000) });
export const idSchema = z.object({ id });

// ---------- Settings ----------

export const settingsSchema = z.object({
  secondaryColourCount: z.number().int().min(0, "Can't be negative.").max(6, "At most 6."),
  effectCount: z.number().int().min(0, "Can't be negative.").max(6, "At most 6."),
  defaultCartLimit: z.number().int().min(1, "At least 1.").max(999),
  customCombosEnabled: z.boolean(),
  shippingFee: rupees("Shipping fee"),
  freeShippingFrom: rupees("Free shipping threshold"),
  whatsappNumber: z
    .string()
    .trim()
    .max(30)
    .refine((s) => s === "" || /^\+?[0-9 ()-]{8,}$/.test(s), "Use digits, e.g. +91 98765 43210."),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email.")]),
});
export type SettingsInput = z.input<typeof settingsSchema>;

// ---------- Colours ----------

export const colourSchema = z.object({
  id: id.optional(),
  name: name(),
  hex,
  active: z.boolean(),
});
export type ColourInput = z.input<typeof colourSchema>;

// ---------- Finishes ----------

export const finishCreateSchema = z.object({ name: name(), slug });

const slotLabel = z.string().trim().min(1, "Every slot needs a label.").max(60);

export const finishSaveSchema = z.object({
  id,
  name: name(),
  slug,
  description: z.string().trim().max(2000),
  active: z.boolean(),
  /** Index 0 is the base colour; the rest are secondary slots in order. */
  colourSlots: z
    .array(z.object({ id: id.optional(), label: slotLabel }))
    .min(1, "The base colour slot is required."),
  effectSlots: z.array(
    z.object({
      id: id.optional(),
      label: slotLabel,
      required: z.boolean(),
      options: z
        .array(
          z.object({
            id: id.optional(),
            name: name("Option name", 80),
            extraPrice: rupees("Extra price"),
            active: z.boolean(),
          }),
        )
        .max(50),
    }),
  ),
});
export type FinishSaveInput = z.input<typeof finishSaveSchema>;

export const colourwaySchema = z.object({
  id: id.optional(),
  finishId: id,
  name: name(),
  active: z.boolean(),
  /** One colour per colour slot of the finish. */
  colours: z.array(z.object({ slotId: id, colourId: id })).min(1),
});
export type ColourwayInput = z.input<typeof colourwaySchema>;

export const reorderInSchema = z.object({ parentId: id, ids: z.array(id).min(1).max(1000) });

// ---------- Categories and tags ----------

export const categorySchema = z.object({
  id: id.optional(),
  parentId: id.nullable(),
  name: name(),
  slug,
  blurb: z.string().trim().max(1000),
  imageId: id.nullable(),
  bgColour: hex,
  active: z.boolean(),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const categoryReorderSchema = z.object({ parentId: id.nullable(), ids: z.array(id).min(1).max(1000) });

export const tagSchema = z.object({
  id: id.optional(),
  name: name(),
  slug,
  blurb: z.string().trim().max(1000),
  imageId: id.nullable(),
});
export type TagInput = z.input<typeof tagSchema>;

// ---------- Navigation ----------

export const navSectionSchema = z.object({
  id: id.optional(),
  heading: name("Heading", 60),
  mode: z.enum(["categories", "manual"]),
  active: z.boolean(),
});
export type NavSectionInput = z.input<typeof navSectionSchema>;

export const navGroupSchema = z.object({
  id: id.optional(),
  sectionId: id,
  title: name("Title", 60),
  highlight: z.boolean(),
});
export type NavGroupInput = z.input<typeof navGroupSchema>;

export const navTargetTypes = ["category", "tag", "product", "combo", "url"] as const;

export const navLinkSchema = z
  .object({
    id: id.optional(),
    groupId: id,
    label: name("Label", 80),
    targetType: z.enum(navTargetTypes),
    targetId: id.nullable(),
    url: z.string().trim().max(500).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.targetType === "url") {
      if (!v.url || !(/^\/(?!\/)/.test(v.url) || /^https?:\/\//.test(v.url)))
        ctx.addIssue({ code: "custom", path: ["url"], message: "Enter a link starting with / or https://." });
    } else if (!v.targetId) {
      ctx.addIssue({ code: "custom", path: ["targetId"], message: `Pick a ${v.targetType}.` });
    }
  });
export type NavLinkInput = z.input<typeof navLinkSchema>;

/** Turns a Zod error into `{ "field.path": "first message" }` for showing under inputs. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
