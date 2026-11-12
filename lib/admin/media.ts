"use server";
// Image upload: (1) presign → browser PUTs the original to R2, (2) process → sharp writes four WebP
// sizes back to R2, (3) the media row is marked processed. See "Image handling" in the backend plan.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/db";
import { media } from "@/db/schema";
import { IMAGE_SIZES } from "@/lib/images";
import {
  ALLOWED_UPLOAD_TYPES,
  getOriginal,
  MAX_UPLOAD_BYTES,
  presignOriginalUpload,
  putWebp,
  r2Configured,
} from "@/lib/r2";
import { ActionError, adminAction } from "./action";

export const requestUpload = adminAction(
  z.object({
    contentType: z.enum(ALLOWED_UPLOAD_TYPES, { message: "Upload a JPEG, PNG, WebP or AVIF image." }),
    bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Images must be 15 MB or smaller."),
    alt: z.string().max(300).default(""),
  }),
  async ({ contentType, bytes, alt }) => {
    if (!r2Configured()) throw new ActionError("Image storage (Cloudflare R2) isn't set up yet.");
    const key = randomUUID();
    const [row] = await db.insert(media).values({ r2Key: key, bytes, alt }).returning({ id: media.id });
    const uploadUrl = await presignOriginalUpload(key, contentType, bytes);
    return { mediaId: row.id, key, uploadUrl };
  },
);

export const processUpload = adminAction(z.object({ mediaId: z.uuid() }), async ({ mediaId }) => {
  const row = await db.query.media.findFirst({ where: eq(media.id, mediaId) });
  if (!row) throw new ActionError("Image not found.");
  const original = await getOriginal(row.r2Key);
  const meta = await sharp(original).metadata();
  for (const [size, width] of Object.entries(IMAGE_SIZES)) {
    const out = await sharp(original)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: size === "thumb" ? 70 : 80 })
      .toBuffer();
    await putWebp(row.r2Key, size, out);
  }
  const [updated] = await db
    .update(media)
    .set({ width: meta.width ?? 0, height: meta.height ?? 0, bytes: original.length, processed: true })
    .where(eq(media.id, mediaId))
    .returning();
  return { id: updated.id, key: updated.r2Key, width: updated.width, height: updated.height, alt: updated.alt };
});

export const updateAlt = adminAction(z.object({ mediaId: z.uuid(), alt: z.string().max(300) }), async (i) => {
  await db.update(media).set({ alt: i.alt }).where(eq(media.id, i.mediaId));
});
