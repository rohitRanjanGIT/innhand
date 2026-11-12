"use client";
// next/image loader: picks the nearest of the four pre-made WebP sizes, so Next's own optimiser
// is never used. `src` is an image key from the media table, a `local:` key for seeded images, or
// a plain /public path (logos).
import type { ImageLoaderProps } from "next/image";
import { imageUrl, sizeFor } from "./images";

export default function r2Loader({ src, width }: ImageLoaderProps) {
  // Local files are served as they are; the width query only tells Next the loader handles sizes.
  if (src.startsWith("/")) return `${src}?w=${width}`;
  if (src.startsWith("local:")) return `${src.slice("local:".length)}?w=${width}`;
  return imageUrl(src, sizeFor(width));
}
