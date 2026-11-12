"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { processUpload, requestUpload } from "@/lib/admin/media";

export type UploadedImage = { id: string; key: string; width: number; height: number; alt: string };

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/**
 * Uploads one or more photos: asks the server for a presigned URL, PUTs the original straight to R2,
 * then asks the server to make the WebP sizes. Calls onUploaded once per finished image.
 */
export default function ImageUploader({
  onUploaded,
  multiple = true,
  label = "Upload photos",
}: {
  onUploaded: (img: UploadedImage) => void;
  multiple?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  async function uploadOne(file: File) {
    const req = await requestUpload({ contentType: file.type as never, bytes: file.size, alt: "" });
    if (!req.ok) throw new Error(req.error);
    const put = await fetch(req.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!put.ok) throw new Error(`Upload failed (${put.status}). Check the R2 bucket's CORS rule.`);
    const done = await processUpload({ mediaId: req.data.mediaId });
    if (!done.ok) throw new Error(done.error);
    onUploaded(done.data);
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setBusy((n) => n + files.length);
    for (const f of files) {
      try {
        await uploadOne(f);
      } catch (err) {
        toast.error(`${f.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} hidden onChange={onChange} />
      <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy > 0}>
        {busy > 0 ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        {busy > 0 ? `Uploading ${busy}…` : label}
      </Button>
    </>
  );
}
