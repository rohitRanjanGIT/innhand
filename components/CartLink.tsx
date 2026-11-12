import { readCartCount } from "@/lib/cart/read";
import CartBadge from "./CartBadge";

/** The live cart count. Reads the visitor's session or guest cookie, so it renders inside Suspense. */
export default async function CartLink() {
  return <CartBadge count={await readCartCount()} />;
}
