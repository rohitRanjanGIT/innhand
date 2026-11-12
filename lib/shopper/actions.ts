"use server";
// Account details and addresses. Every action re-reads the session and validates with Zod.
import { refresh } from "next/cache";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { addresses, user } from "@/db/schema";
import { getSession } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

const MAX_ADDRESSES = 10;
const phone = z
  .string()
  .trim()
  .max(20)
  .regex(/^[+\d][\d\s-]{6,19}$/, "Enter a valid phone number");

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  phone: z.union([z.literal(""), phone]),
  orderUpdates: z.boolean(),
  offers: z.boolean(),
});

const addressSchema = z.object({
  id: z.guid().nullable(),
  label: z.string().trim().max(30).default("Home"),
  name: z.string().trim().min(1, "Enter a name").max(80),
  line1: z.string().trim().min(1, "Enter the address").max(120),
  line2: z.string().trim().max(120).default(""),
  city: z.string().trim().min(1, "Enter the city").max(60),
  state: z.string().trim().min(1, "Enter the state").max(60),
  pin: z.string().trim().regex(/^\d{6}$/, "PIN code is 6 digits"),
  phone,
  isDefault: z.boolean(),
});

async function userId() {
  const s = await getSession();
  return s?.user.id ?? null;
}

const SIGNED_OUT: ActionResult = { ok: false, error: "Please sign in again." };

function fieldErrors(e: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const i of e.issues) fields[String(i.path[0])] ??= i.message;
  return { ok: false as const, error: Object.values(fields)[0] ?? "Please check the form.", fields };
}

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return SIGNED_OUT;
  const p = profileSchema.safeParse(input);
  if (!p.success) return fieldErrors(p.error);
  await db
    .update(user)
    .set({ name: p.data.name, phone: p.data.phone || null, orderUpdates: p.data.orderUpdates, offers: p.data.offers, updatedAt: new Date() })
    .where(eq(user.id, uid));
  refresh();
  return { ok: true };
}

/** Adds an address (id null) or edits one of the shopper's own. */
export async function saveAddress(input: z.input<typeof addressSchema>): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return SIGNED_OUT;
  const p = addressSchema.safeParse(input);
  if (!p.success) return fieldErrors(p.error);
  const { id, ...data } = p.data;
  const label = data.label || "Home";

  const result = await db.transaction(async (tx) => {
    const mine = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, uid));
    if (id && !mine.some((a) => a.id === id)) return { ok: false as const, error: "That address no longer exists." };
    if (!id && mine.length >= MAX_ADDRESSES) return { ok: false as const, error: `You can save up to ${MAX_ADDRESSES} addresses.` };
    // The first address is always the default.
    const isDefault = data.isDefault || mine.length === 0 || (mine.length === 1 && mine[0].id === id);
    let savedId = id;
    if (id) {
      await tx
        .update(addresses)
        .set({ ...data, label, isDefault })
        .where(and(eq(addresses.id, id), eq(addresses.userId, uid)));
    } else {
      const [row] = await tx.insert(addresses).values({ ...data, label, isDefault, userId: uid }).returning({ id: addresses.id });
      savedId = row.id;
    }
    if (isDefault)
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(and(eq(addresses.userId, uid), ne(addresses.id, savedId!)));
    return { ok: true as const };
  });
  if (result.ok) refresh();
  return result;
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return SIGNED_OUT;
  if (!z.guid().safeParse(id).success) return { ok: false, error: "That address no longer exists." };
  await db.transaction(async (tx) => {
    const [gone] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, uid)))
      .returning({ isDefault: addresses.isDefault });
    if (gone?.isDefault) {
      // Keep one default: the newest remaining address.
      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, uid))
        .orderBy(desc(addresses.createdAt))
        .limit(1);
      if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
    }
  });
  refresh();
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return SIGNED_OUT;
  if (!z.guid().safeParse(id).success) return { ok: false, error: "That address no longer exists." };
  await db.transaction(async (tx) => {
    const [mine] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, uid)));
    if (!mine) return;
    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, uid));
    await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, id));
  });
  refresh();
  return { ok: true };
}
