"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Video, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { requestVideoUpload } from "@/lib/admin/media";
import { videoUrl } from "@/lib/images";

export type VideoValue = { key: string } | null;

const ACCEPT = "video/mp4,video/webm";

/** PUTs the file with progress (fetch can't report upload progress). */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}). Check the R2 bucket's CORS rule.`));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and the R2 bucket's CORS rule."));
    xhr.send(file);
  });
}

/**
 * One optional short video, uploaded straight to R2 with a presigned URL. The new video only becomes
 * the live one when the form is saved; the previous file is deleted at that point.
 */
export default function VideoField({ value, onChange }: { value: VideoValue; onChange: (v: VideoValue) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProgress(0);
    try {
      const req = await requestVideoUpload({ contentType: file.type as never, bytes: file.size });
      if (!req.ok) throw new Error(req.error);
      await putWithProgress(req.data.uploadUrl, file, setProgress);
      onChange({ key: req.data.key });
    } catch (err) {
      toast.error(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <div className="grid gap-3">
      {value && (
        <video
          key={value.key}
          src={videoUrl(value.key)}
          controls
          preload="metadata"
          className="aspect-video w-full max-w-md rounded-md border bg-black"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept={ACCEPT} hidden onChange={onPick} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Video />}
          {busy ? `Uploading ${progress}%` : value ? "Replace video" : "Upload video"}
        </Button>
        {value && !busy && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            <X /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
