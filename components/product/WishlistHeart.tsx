import { isWishlisted } from "@/lib/cart/read";
import WishButton from "./WishButton";

/** Reads the visitor's wishlist, so it renders inside Suspense. */
export default async function WishlistHeart({ productId }: { productId: string }) {
  return <WishButton productId={productId} saved={await isWishlisted(productId)} />;
}
