"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { ImageOff, Star, X } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Sortable } from "./Sortable";
import { FieldError } from "./fields";
import type { FinishOption, ProductFormOptions } from "@/lib/admin/queries/products";
import { imageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { ProductInput } from "@/lib/validation/product";

export type MediaInfo = { key: string; alt: string };
type FinishRow = ProductInput["finishes"][number];
type ImageRow = FinishRow["images"][number];

const NO_COLOURWAY = "__none";

export function FinishesTab({
  options,
  mediaInfo,
  onMedia,
  stash,
  onStash,
}: {
  options: ProductFormOptions;
  mediaInfo: Record<string, MediaInfo>;
  onMedia: (mediaId: string, info: MediaInfo) => void;
  stash: Record<string, ImageRow[]>;
  onStash: (finishId: string, imgs: ImageRow[]) => void;
}) {
  const { setValue, getValues, control, formState } = useFormContext<ProductInput>();
  const rows = useWatch({ control, name: "finishes" });
  const byId = new Map(options.finishes.map((f) => [f.id, f]));
  const ticked = new Set(rows.map((r) => r.finishId));

  const write = (next: FinishRow[]) =>
    setValue("finishes", next, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  function toggle(finishId: string, on: boolean) {
    if (on) {
      write([...rows, { finishId, isDefault: rows.length === 0, images: stash[finishId] ?? [] }]);
    } else {
      const leaving = rows.find((r) => r.finishId === finishId);
      if (leaving) onStash(finishId, leaving.images);
      const next = rows.filter((r) => r.finishId !== finishId);
      if (leaving?.isDefault && next.length > 0) next[0] = { ...next[0], isDefault: true };
      write(next);
    }
  }

  const setDefault = (finishId: string) => write(rows.map((r) => ({ ...r, isDefault: r.finishId === finishId })));
  const setImages = (finishId: string, images: ImageRow[]) =>
    write(rows.map((r) => (r.finishId === finishId ? { ...r, images } : r)));
  // Uploads finish one by one, after this render; read the current list so a batch appends in turn.
  const appendImage = (finishId: string, mediaId: string) =>
    write(
      getValues("finishes").map((r) =>
        r.finishId === finishId ? { ...r, images: [...r.images, { mediaId, colourwayId: null }] } : r,
      ),
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Finishes</CardTitle>
          <CardDescription>
            Tick the finishes this product comes in and star the one shown first. Unticking a finish that's in a
            cart or a combo hides it instead of deleting it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {options.finishes.map((f) => {
              const on = ticked.has(f.id);
              if (!on && !f.active) return null;
              return (
                <label
                  key={f.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    on ? "border-primary bg-primary/5" : "hover:bg-muted",
                  )}
                >
                  <Checkbox checked={on} onCheckedChange={(v) => toggle(f.id, v === true)} />
                  {f.name}
                  {!f.active && <span className="text-xs text-muted-foreground">(switched off)</span>}
                </label>
              );
            })}
            {options.finishes.length === 0 && (
              <p className="text-sm text-muted-foreground">No finishes yet. Add them under Finishes first.</p>
            )}
          </div>
          <FieldError message={formState.errors.finishes?.message ?? formState.errors.finishes?.root?.message} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tick a finish above to add its photos.</p>
      ) : (
        <Sortable
          items={rows}
          getId={(r) => r.finishId}
          onReorder={write}
          className="space-y-4"
        >
          {(row, _i, handle) => {
            const finish = byId.get(row.finishId);
            return (
              <FinishCard
                row={row}
                finish={finish}
                handle={rows.length > 1 ? handle : null}
                mediaInfo={mediaInfo}
                onMedia={onMedia}
                onDefault={() => setDefault(row.finishId)}
                onRemove={() => toggle(row.finishId, false)}
                onImages={(imgs) => setImages(row.finishId, imgs)}
                onUploaded={(mediaId) => appendImage(row.finishId, mediaId)}
              />
            );
          }}
        </Sortable>
      )}
      {rows.length > 1 && (
        <p className="text-xs text-muted-foreground">Drag the handle on a finish to change the order shoppers see.</p>
      )}
    </div>
  );
}

function FinishCard({
  row,
  finish,
  handle,
  mediaInfo,
  onMedia,
  onDefault,
  onRemove,
  onImages,
  onUploaded,
}: {
  row: FinishRow;
  finish: FinishOption | undefined;
  handle: React.ReactNode;
  mediaInfo: Record<string, MediaInfo>;
  onMedia: (mediaId: string, info: MediaInfo) => void;
  onDefault: () => void;
  onRemove: () => void;
  onImages: (imgs: ImageRow[]) => void;
  onUploaded: (mediaId: string) => void;
}) {
  const colourways = finish?.colourways ?? [];
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0">
        {handle}
        <CardTitle className="text-base">{finish?.name ?? "Unknown finish"}</CardTitle>
        {row.isDefault ? (
          <Badge variant="secondary" className="gap-1">
            <Star className="size-3 fill-current" /> Default
          </Badge>
        ) : (
          <Button type="button" variant="ghost" size="xs" onClick={onDefault}>
            <Star /> Make default
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {row.images.length} photo{row.images.length === 1 ? "" : "s"}
          {colourways.length > 0 && ` · ${colourways.filter((c) => c.active).length} colourways`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ImageUploader
            label="Add photos"
            onUploaded={(img) => {
              onMedia(img.id, { key: img.key, alt: img.alt });
              onUploaded(img.id);
            }}
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Untick ${finish?.name}`}>
            <X />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {row.images.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground">
            <ImageOff className="size-5" />
            No photos for this finish yet
          </div>
        ) : (
          <Sortable
            items={row.images}
            getId={(img) => img.mediaId}
            onReorder={onImages}
            layout="grid"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {(img, i, imgHandle) => {
              const info = mediaInfo[img.mediaId];
              return (
                <div className="overflow-hidden rounded-md border bg-card">
                  <div className="relative aspect-square bg-muted">
                    {info ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(info.key, "thumb")} alt={info.alt} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-5" />
                      </div>
                    )}
                    {i === 0 && (
                      <Badge className="absolute top-1.5 left-1.5" variant="secondary">
                        Main
                      </Badge>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 rounded-md bg-background/90">
                      {imgHandle}
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="Remove photo"
                        onClick={() => onImages(row.images.filter((x) => x.mediaId !== img.mediaId))}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                  {colourways.length > 0 && (
                    <div className="p-1.5">
                      <Select
                        value={img.colourwayId ?? NO_COLOURWAY}
                        onValueChange={(v) =>
                          onImages(
                            row.images.map((x) =>
                              x.mediaId === img.mediaId ? { ...x, colourwayId: v === NO_COLOURWAY ? null : v } : x,
                            ),
                          )
                        }
                      >
                        <SelectTrigger size="sm" className="w-full text-xs" aria-label="Colourway">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value={NO_COLOURWAY}>Any colourway</SelectItem>
                          {colourways.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <Swatches hexes={c.hexes} />
                              {c.name}
                              {!c.active && <span className="text-muted-foreground"> (off)</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            }}
          </Sortable>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          The first photo is the main one. Link a photo to a colourway to show it when a shopper picks that colourway.
        </p>
      </CardContent>
    </Card>
  );
}

function Swatches({ hexes }: { hexes: string[] }) {
  return (
    <span className="flex -space-x-1">
      {hexes.map((h, i) => (
        <span key={i} className="size-3 rounded-full border border-background" style={{ backgroundColor: h }} />
      ))}
    </span>
  );
}
