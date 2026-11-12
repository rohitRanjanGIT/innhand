import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses, user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { loadWishlistIds } from "@/lib/cart/read";
import type { Address, Profile } from "./types";

const MONTH_YEAR = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** The signed-in shopper's details, addresses and saved count (redirects to sign-in otherwise). */
export async function readAccount() {
  const u = await requireUser("/account");
  const [row, list, saved] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, u.id),
      columns: { name: true, email: true, phone: true, orderUpdates: true, offers: true, createdAt: true },
    }),
    db
      .select({
        id: addresses.id,
        label: addresses.label,
        name: addresses.name,
        line1: addresses.line1,
        line2: addresses.line2,
        city: addresses.city,
        state: addresses.state,
        pin: addresses.pin,
        phone: addresses.phone,
        isDefault: addresses.isDefault,
      })
      .from(addresses)
      .where(eq(addresses.userId, u.id))
      .orderBy(desc(addresses.isDefault), asc(addresses.createdAt)),
    loadWishlistIds({ userId: u.id, guestId: null }),
  ]);
  const profile: Profile = {
    name: row?.name ?? u.name,
    email: row?.email ?? u.email,
    phone: row?.phone ?? "",
    orderUpdates: row?.orderUpdates ?? true,
    offers: row?.offers ?? false,
    memberSince: MONTH_YEAR.format(row?.createdAt ?? u.createdAt),
  };
  return { profile, addresses: list satisfies Address[], wishlistCount: saved.length };
}
