"use client";

import { useState } from "react";
import { ImageOff, Pencil, Plus } from "lucide-react";
import { deleteEffect, reorderEffects, saveEffect } from "@/lib/admin/effects";
import type { AdminEffect } from "@/lib/admin/queries/finishes";
import { effectSchema, fieldErrorsOf } from "@/lib/admin/schemas/catalogue";
import { DragHandle, SortableList } from "@/components/admin/SortableList";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import {
  ConfirmButton,
  EmptyState,
  Field,
  ImageField,
  SavingIcon,
  firstErrors,
  useActionRunner,
  type ImageValue,
} from "./shared";

type Draft = { id?: string; name: string; image: ImageValue; active: boolean; hadImage: boolean };

const toDraft = (e: AdminEffect): Draft => ({
  id: e.id,
  name: e.name,
  image: e.imageId && e.imageUrl ? { id: e.imageId, url: e.imageUrl } : null,
  active: e.active,
  hadImage: !!e.imageId,
});

export function EffectThumb({ url, className = "size-8" }: { url: string | null; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted ${className}`}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImageOff className="size-4 text-muted-foreground" />}
    </span>
  );
}

export default function EffectsManager({ effects }: { effects: AdminEffect[] }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [, run] = useActionRunner();

  const addButton = (
    <Button onClick={() => setEditing({ name: "", image: null, active: true, hadImage: false })}>
      <Plus /> Add effect
    </Button>
  );

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex justify-end">{addButton}</div>
      {effects.length === 0 ? (
        <EmptyState
          title="No effects yet"
          description="Add the effects (gold leaf, flakes…) finishes can offer. Prices are set on each finish."
          action={addButton}
        />
      ) : (
        <SortableList
          items={effects}
          onReorder={(ids) => run(() => reorderEffects({ ids }), { success: "Order saved" })}
          renderItem={(e, handle) => (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-3">
              <DragHandle {...handle} />
              <EffectThumb url={e.imageUrl} className="size-10" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.name}</span>
                  {!e.active && <Badge variant="secondary">Archived</Badge>}
                  {!e.imageId && <Badge variant="outline">No image</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {e.usedBy === 0 ? "not on any finish" : `on ${e.usedBy} finish${e.usedBy === 1 ? "" : "es"}`}
                </div>
              </div>
              <Switch
                checked={e.active}
                aria-label={e.active ? "Archive effect" : "Restore effect"}
                onCheckedChange={(active) =>
                  run(() => saveEffect({ id: e.id, name: e.name, imageId: e.imageId, active }), {
                    success: active ? `${e.name} restored` : `${e.name} archived`,
                  })
                }
              />
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${e.name}`} onClick={() => setEditing(toDraft(e))}>
                <Pencil />
              </Button>
              <ConfirmButton
                label={`Delete ${e.name}`}
                disabled={e.usedBy > 0}
                title={`Delete ${e.name}?`}
                description="No finish offers it, so it can be removed for good. Its image is deleted too."
                onConfirm={() => run(() => deleteEffect({ id: e.id }), { success: `${e.name} deleted` })}
              />
            </div>
          )}
        />
      )}
      <p className="text-xs text-muted-foreground">
        An effect that a finish offers can only be archived (switch off), not deleted. Archiving hides it from shoppers
        on every finish. Selling and cost prices are set in each finish&apos;s editor.
      </p>
      <EffectDialog value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EffectDialog({ value, onClose }: { value: Draft | null; onClose: () => void }) {
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{value && <EffectForm key={value.id ?? "new"} initial={value} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function EffectForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  // New effects need an image; one carried over without an image may be saved as it is until one is added.
  const imageRequired = !initial.id || initial.hadImage;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = effectSchema.safeParse({ id: d.id, name: d.name, imageId: d.image?.id ?? null, active: d.active });
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    if (imageRequired && !parsed.data.imageId) return setErrors({ imageId: "Add an image of the effect." });
    run(() => saveEffect(parsed.data), {
      success: initial.id ? "Effect saved" : "Effect added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{initial.id ? "Edit effect" : "Add effect"}</DialogTitle>
        <DialogDescription>Shoppers see the image and name next to the price you set on each finish.</DialogDescription>
      </DialogHeader>
      <Field label="Name" htmlFor="effect-name" error={errors.name}>
        <Input
          id="effect-name"
          value={d.name}
          placeholder="e.g. Gold leaf"
          autoFocus
          onChange={(e) => setD({ ...d, name: e.target.value })}
        />
      </Field>
      <Field label="Image" error={errors.imageId}>
        <ImageField value={d.image} onChange={(image) => setD({ ...d, image })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={d.active} onCheckedChange={(active) => setD({ ...d, active })} /> Active
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}
