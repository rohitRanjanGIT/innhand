import "server-only";
import { safeReturnTo } from "@/lib/session";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** `?next=` checked with safeReturnTo, and `?email=`. */
export async function readAuthParams(searchParams: SearchParams) {
  const sp = await searchParams;
  return { next: safeReturnTo(first(sp.next), "/account"), email: first(sp.email).trim().slice(0, 254) };
}
