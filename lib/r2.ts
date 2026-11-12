import "server-only";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IMAGE_SIZES } from "./images";

const env = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
};

export const r2Configured = () => Object.values(env).every(Boolean) && !!process.env.R2_PUBLIC_URL;

let client: S3Client | null = null;
function r2() {
  if (!r2Configured()) throw new Error("Cloudflare R2 is not configured. Fill the R2_* values in .env.local.");
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.accessKeyId!, secretAccessKey: env.secretAccessKey! },
  });
  return client;
}

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const IMMUTABLE = "public, max-age=31536000, immutable";

export const originalKey = (id: string) => `originals/${id}`;
export const sizeKey = (id: string, size: string) => `${id}/${size}.webp`;

/** A short-lived URL the admin's browser PUTs the original to. One key, one content type. */
export async function presignOriginalUpload(id: string, contentType: string, bytes: number) {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: originalKey(id),
      ContentType: contentType,
      ContentLength: bytes,
    }),
    { expiresIn: 300 },
  );
}

export async function getOriginal(id: string): Promise<Buffer> {
  const res = await r2().send(new GetObjectCommand({ Bucket: env.bucket, Key: originalKey(id) }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

export async function putWebp(id: string, size: string, body: Buffer) {
  await r2().send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: sizeKey(id, size),
      Body: body,
      ContentType: "image/webp",
      CacheControl: IMMUTABLE,
    }),
  );
}

/** Deletes the original and every generated size. */
export async function deleteImageFiles(id: string) {
  await r2().send(
    new DeleteObjectsCommand({
      Bucket: env.bucket,
      Delete: {
        Objects: [{ Key: originalKey(id) }, ...Object.keys(IMAGE_SIZES).map((s) => ({ Key: sizeKey(id, s) }))],
      },
    }),
  );
}
