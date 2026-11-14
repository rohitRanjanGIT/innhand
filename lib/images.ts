// Every image URL is built here. No component writes an image URL by hand.

export const IMAGE_SIZES = { thumb: 200, tile: 600, gallery: 1000, zoom: 1600 } as const;
export type ImageSize = keyof typeof IMAGE_SIZES;

const PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

/**
 * Images seeded from /public/assets keep a `local:` key (e.g. `local:/assets/products/x.jpg`) until
 * they are re-uploaded to R2, so the shop keeps working before R2 is set up.
 */
export function imageUrl(key: string, size: ImageSize = "tile") {
  if (key.startsWith("local:")) return key.slice("local:".length);
  return `${PUBLIC_URL}/${key}/${size}.webp`;
}

/** URL of an uploaded video (`videos/<uuid>.mp4`). Videos are stored as uploaded, with no sizes. */
export function videoUrl(key: string) {
  return `${PUBLIC_URL}/${key}`;
}

/** The smallest of the four sizes that is at least `width` wide. */
export function sizeFor(width: number): ImageSize {
  const entries = Object.entries(IMAGE_SIZES) as [ImageSize, number][];
  return (entries.find(([, w]) => w >= width) ?? entries[entries.length - 1])[0];
}
