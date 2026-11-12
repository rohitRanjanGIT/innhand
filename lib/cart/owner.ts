import "server-only";
// Who owns the cart and wishlist: the signed-in user, or a guest identified by an http-only cookie
// holding a random id. The cookie is only ever set by a Server Action (first add to cart or
// wishlist), never while rendering.
import { cookies } from "next/headers";
import { and, eq, type SQL } from "drizzle-orm";
import { carts, wishlistItems } from "@/db/schema";
import { getSession } from "@/lib/session";
import { GUEST_COOKIE } from "./cookie";

export { GUEST_COOKIE };
const GUEST_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Owner = { userId: string; guestId: null } | { userId: null; guestId: string };

export async function readGuestId() {
  const v = (await cookies()).get(GUEST_COOKIE)?.value;
  return v && UUID.test(v) ? v : null;
}

/** The current owner, or null for a visitor who has never added anything. Reads the request. */
export async function currentOwner(): Promise<Owner | null> {
  const s = await getSession();
  if (s) return { userId: s.user.id, guestId: null };
  const guestId = await readGuestId();
  return guestId ? { userId: null, guestId } : null;
}

/** Server Actions only: the current owner, creating the guest cookie on first use. */
export async function ensureOwner(): Promise<Owner> {
  const owner = await currentOwner();
  if (owner) return owner;
  const guestId = crypto.randomUUID();
  (await cookies()).set(GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_MAX_AGE,
  });
  return { userId: null, guestId };
}

/** Server Actions only. */
export async function clearGuestCookie() {
  (await cookies()).delete(GUEST_COOKIE);
}

export function cartOwnerWhere(o: Owner): SQL {
  return and(
    o.userId ? eq(carts.userId, o.userId) : eq(carts.guestId, o.guestId!),
    eq(carts.status, "active"),
  )!;
}

export function wishlistOwnerWhere(o: Owner): SQL {
  return o.userId ? eq(wishlistItems.userId, o.userId) : eq(wishlistItems.guestId, o.guestId!);
}
