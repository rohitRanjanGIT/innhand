"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { deleteColourway, reorderColourways, saveColourway, setColourwayActive } from "@/lib/admin/finishes";
import type { FinishEditorData } from "@/lib/admin/queries/finishes";
import { colourwaySchema, fieldErrorsOf } from "@/lib/admin/schemas/catalogue";
import { DragHandle, SortableList } from "@/components/admin/SortableList";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Switch } from "@/components/admin/ui/switch";
import { ConfirmButton, EmptyState, Field, FieldError, SavingIcon, Swatch, firstErrors, useActionRunner } from "./shared";

type Slot = FinishEditorData["finish"]["colourSlots"][number];
type PaletteColour = FinishEditorData["palette"][number];
type Colourway = FinishEditorData["colourways"][number];
type Draft = { id?: string; name: string; active: boolean; colours: Record<string, string> };

/** "Swirl colour" → "swirl"; "Base colour" → "". */
function slotWord(label: string) {
  return label
    .replace(/\bcolou?rs?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** "Ivory + Plum swirl": the base colour, then each secondary colour with its slot's word. */
export function suggestColourwayName(slots: Slot[], picked: Record<string, string>, palette: PaletteColour[]) {
  const nameOf = (id?: string) => palette.find((c) => c.id === id)?.name;
  const parts = slots.flatMap((s) => {
    const colour = nameOf(picked[s.id]);
    if (!colour) return [];
    const word = s.position === 0 ? "" : slotWord(s.label);
    return [word ? `${colour} ${word}` : colour];
  });
  return parts.join(" + ");
}

/** A swatch showing the base colour with the secondary colours as bands. */
export function ColourwayPreview({ hexes, className }: { hexes: string[]; className?: string }) {
  const [base, ...rest] = hexes;
  const bg =
    rest.length === 0
      ? base
      : `linear-gradient(135deg, ${base} 0 55%, ${rest
          .map((h, i) => `${h} ${55 + (45 / rest.length) * i}% ${55 + (45 / rest.length) * (i + 1)}%`)
          .join(", ")})`;
  return (
    <span
      className={`inline-block size-10 shrink-0 rounded-md border border-black/10 ${className ?? ""}`}
      style={{ background: bg ?? "transparent" }}
    />
  );
}

export default function ColourwaysManager({
  finishId,
  slots,
  palette,
  colourways,
  blocked,
}: {
  finishId: string;
  slots: Slot[];
  palette: PaletteColour[];
  colourways: Colourway[];
  /** Set while the finish form has unsaved changes. */
  blocked: string | null;
}) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [, run] = useActionRunner();
  const hexOf = (id?: string) => palette.find((c) => c.id === id)?.hex;
  const isComplete = (cw: Colourway) => slots.every((s) => cw.colours[s.id]);

  const addButton = (
    <Button disabled={!!blocked} onClick={() => setEditing({ name: "", active: true, colours: {} })}>
      <Plus /> Add colourway
    </Button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>Colourways</CardTitle>
          <CardDescription>
            Ready-made colour combinations, offered on every product with this finish. Drag to reorder.
          </CardDescription>
        </div>
        {addButton}
      </CardHeader>
      <CardContent className="grid gap-3">
        {blocked && <p className="rounded-md bg-muted px-3 py-2 text-sm">{blocked}</p>}
        {colourways.length === 0 ? (
          <EmptyState title="No colourways yet" description="Pick one colour per slot to make the first." />
        ) : (
          <SortableList
            items={colourways}
            disabled={!!blocked}
            onReorder={(ids) => run(() => reorderColourways({ parentId: finishId, ids }), { success: "Order saved" })}
            renderItem={(cw, handle) => (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-3">
                <DragHandle {...handle} />
                <ColourwayPreview hexes={slots.map((s) => hexOf(cw.colours[s.id]) ?? "transparent")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{cw.name}</span>
                    {!cw.active && <Badge variant="secondary">Archived</Badge>}
                    {!isComplete(cw) && <Badge variant="destructive">Missing a colour</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {slots.map((s) => {
                      const c = palette.find((p) => p.id === cw.colours[s.id]);
                      return (
                        <span key={s.id} className="inline-flex items-center gap-1">
                          <Swatch hex={c?.hex ?? "transparent"} className="size-3" />
                          {s.label}: {c?.name ?? "—"}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <Switch
                  checked={cw.active}
                  disabled={!!blocked}
                  aria-label={cw.active ? "Archive colourway" : "Restore colourway"}
                  onCheckedChange={(active) =>
                    run(() => setColourwayActive({ id: cw.id, active }), {
                      success: active ? "Colourway restored" : "Colourway archived",
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!!blocked}
                  aria-label={`Edit ${cw.name}`}
                  onClick={() => setEditing({ id: cw.id, name: cw.name, active: cw.active, colours: cw.colours })}
                >
                  <Pencil />
                </Button>
                <ConfirmButton
                  label={`Delete ${cw.name}`}
                  disabled={cw.inUse || !!blocked}
                  title={`Delete ${cw.name}?`}
                  description={
                    cw.inUse
                      ? "Carts or product photos use it, so it can only be archived."
                      : "No cart or product photo uses it, so it can be removed for good."
                  }
                  onConfirm={() => run(() => deleteColourway({ id: cw.id }), { success: "Colourway deleted" })}
                />
              </div>
            )}
          />
        )}
        <p className="text-xs text-muted-foreground">
          A colourway that carts or product photos point at can only be archived, never deleted.
        </p>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <ColourwayForm
              key={editing.id ?? "new"}
              finishId={finishId}
              slots={slots}
              palette={palette}
              initial={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ColourwayForm({
  finishId,
  slots,
  palette,
  initial,
  onDone,
}: {
  finishId: string;
  slots: Slot[];
  palette: PaletteColour[];
  initial: Draft;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  // The name follows the colours until the admin types their own.
  const [nameTouched, setNameTouched] = useState(
    !!initial.id && initial.name !== suggestColourwayName(slots, initial.colours, palette),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  const suggestion = suggestColourwayName(slots, draft.colours, palette);

  function pick(slotId: string, colourId: string) {
    const colours = { ...draft.colours, [slotId]: colourId };
    setDraft({ ...draft, colours, name: nameTouched ? draft.name : suggestColourwayName(slots, colours, palette) });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = slots.filter((s) => !draft.colours[s.id]);
    if (missing.length) {
      setErrors({ colours: `Pick a colour for ${missing.map((s) => s.label).join(", ")}.` });
      return;
    }
    const input = {
      id: draft.id,
      finishId,
      name: draft.name,
      active: draft.active,
      colours: slots.map((s) => ({ slotId: s.id, colourId: draft.colours[s.id] })),
    };
    const parsed = colourwaySchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveColourway(parsed.data), {
      success: draft.id ? "Colourway saved" : "Colourway added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{draft.id ? "Edit colourway" : "Add colourway"}</DialogTitle>
        <DialogDescription>One colour per slot.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-4">
        <ColourwayPreview
          className="size-16"
          hexes={slots.map((s) => palette.find((c) => c.id === draft.colours[s.id])?.hex ?? "#ffffff")}
        />
        <div className="grid flex-1 gap-3">
          {slots.map((s) => {
            // Archived colours stay pickable only where they're already used.
            const options = palette.filter((c) => c.active || c.id === draft.colours[s.id]);
            return (
              <div key={s.id} className="grid gap-1">
                <Label htmlFor={`slot-${s.id}`}>{s.label}</Label>
                <Select value={draft.colours[s.id] ?? ""} onValueChange={(v) => pick(s.id, v)}>
                  <SelectTrigger id={`slot-${s.id}`} className="w-full">
                    <SelectValue placeholder="Pick a colour" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <Swatch hex={c.hex} className="size-4" />
                        {c.name}
                        {!c.active && " (archived)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          <FieldError message={errors.colours} />
        </div>
      </div>

      <Field
        label="Name"
        htmlFor="cw-name"
        error={errors.name}
        hint={
          nameTouched && suggestion && suggestion !== draft.name ? (
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => {
                setNameTouched(false);
                setDraft({ ...draft, name: suggestion });
              }}
            >
              Use &quot;{suggestion}&quot;
            </button>
          ) : (
            "Suggested from the colours; edit it if you like."
          )
        }
      >
        <Input
          id="cw-name"
          value={draft.name}
          onChange={(e) => {
            setNameTouched(true);
            setDraft({ ...draft, name: e.target.value });
          }}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} /> Active
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}
