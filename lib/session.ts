import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { auth } from "./auth";
import { isAdminEmail } from "./admin-emails";

/** The signed-in session, read from the database (once per request). Null when signed out. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** The signed-in shopper, or a redirect to sign-in that brings them back to `returnTo`. */
export async function requireUser(returnTo = "/account") {
  const s = await getSession();
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(safeReturnTo(returnTo))}`);
  return s.user;
}

/**
 * Every admin Server Action and admin read starts with this. It checks the database session, the
 * role, and that the email is still listed in ADMIN_EMAILS. The proxy redirect is only a convenience.
 */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/sign-in");
  const u = s.user as typeof s.user & { role?: string };
  if (!u.emailVerified || !isAdminEmail(u.email)) redirect("/admin/sign-in?denied=1");
  if (u.role !== "admin") {
    // ADMIN_EMAILS gained this address after the account was created.
    await db.update(userTable).set({ role: "admin" }).where(eq(userTable.id, u.id));
  }
  return u;
}

/** Same check, for code that must not redirect (returns false instead). */
export async function isAdmin() {
  const s = await getSession();
  return !!s && s.user.emailVerified && isAdminEmail(s.user.email);
}

/** Return addresses must stay on our own site. */
export function safeReturnTo(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
