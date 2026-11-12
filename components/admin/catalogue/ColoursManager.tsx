"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { deleteColour, reorderColours, saveColour } from "@/lib/admin/colours";
import type { AdminColour } from "@/lib/admin/queries/finishes";
import { colourSchema, fieldErrorsOf, type ColourInput as ColourValues } from "@/lib/admin/schemas/catalogue";
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
import { ColourInput, ConfirmButton, EmptyState, Field, SavingIcon, Swatch, firstErrors, useActionRunner } from "./shared";

export default function ColoursManager({ colours }: { colours: AdminColour[] }) {
  const [editing, setEditing] = useState<ColourValues | null>(null);
  const [, run] = useActionRunner();

  const addButton = (
    <Button onClick={() => setEditing({ name: "", hex: "#E1DAD3", active: true })}>
      <Plus /> Add colour
    </Button>
  );

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex justify-end">{addButton}</div>
      {colours.length === 0 ? (
        <EmptyState title="No colours yet" description="Add the colours your finishes are made in." action={addButton} />
      ) : (
        <SortableList
          items={colours}
          onReorder={(ids) => run(() => reorderColours({ ids }), { success: "Order saved" })}
          renderItem={(c, handle) => (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-3">
              <DragHandle {...handle} />
              <Swatch hex={c.hex} className="size-8" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {!c.active && <Badge variant="secondary">Archived</Badge>}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {c.hex} · {c.usedBy === 0 ? "not used" : `in ${c.usedBy} colourway${c.usedBy === 1 ? "" : "s"}`}
                </div>
              </div>
              <Switch
                checked={c.active}
                aria-label={c.active ? "Archive colour" : "Restore colour"}
                onCheckedChange={(active) =>
                  run(() => saveColour({ id: c.id, name: c.name, hex: c.hex, active }), {
                    success: active ? `${c.name} restored` : `${c.name} archived`,
                  })
                }
              />
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                <Pencil />
              </Button>
              <ConfirmButton
                label={`Delete ${c.name}`}
                disabled={c.usedBy > 0}
                title={`Delete ${c.name}?`}
                description="It isn't used by any colourway, so it can be removed for good."
                onConfirm={() => run(() => deleteColour({ id: c.id }), { success: `${c.name} deleted` })}
              />
            </div>
          )}
        />
      )}
      <p className="text-xs text-muted-foreground">
        A colour that a colourway uses can only be archived (switch off), not deleted. Archived colours can&apos;t be
        picked for new colourways.
      </p>
      <ColourDialog value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ColourDialog({ value, onClose }: { value: ColourValues | null; onClose: () => void }) {
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {value && <ColourForm key={value.id ?? "new"} initial={value} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ColourForm({ initial, onDone }: { initial: ColourValues; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = colourSchema.safeParse(v);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveColour(parsed.data), {
      success: initial.id ? "Colour saved" : "Colour added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{initial.id ? "Edit colour" : "Add colour"}</DialogTitle>
        <DialogDescription>Colours make up the colourways of every finish.</DialogDescription>
      </DialogHeader>
      <Field label="Name" htmlFor="colour-name" error={errors.name}>
        <Input id="colour-name" value={v.name} autoFocus onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field label="Colour" htmlFor="colour-hex" error={errors.hex}>
        <div className="flex items-center gap-3">
          <ColourInput id="colour-hex" value={v.hex} onChange={(hex) => setV({ ...v, hex })} invalid={!!errors.hex} />
          <Swatch hex={/^#[0-9a-fA-F]{6}$/.test(v.hex) ? v.hex : "transparent"} className="size-9" />
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={v.active} onCheckedChange={(active) => setV({ ...v, active })} /> Active
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}
