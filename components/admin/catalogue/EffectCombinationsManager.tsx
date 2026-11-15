"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import {
  deleteEffectCombination,
  reorderEffectCombinations,
  saveEffectCombination,
  setEffectCombinationActive,
} from "@/lib/admin/finishes";
import type { FinishEditorData } from "@/lib/admin/queries/finishes";
import { effectCombinationSchema, fieldErrorsOf } from "@/lib/admin/schemas/catalogue";
import { formatPrice } from "@/lib/pricing";
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
import { EffectThumb } from "./EffectsManager";
import { ConfirmButton, EmptyState, Field, FieldError, SavingIcon, firstErrors, useActionRunner } from "./shared";

type Slot = FinishEditorData["finish"]["effectSlots"][number];
type LibraryEffect = FinishEditorData["library"][number];
type Combination = FinishEditorData["effectCombinations"][number];
type Draft = {
  id?: string;
  name: string;
  sellingPrice: string;
  costPrice: string;
  active: boolean;
  effects: Record<string, string>;
};

/** "Gold leaf + Gold rim": the picked effects in slot order. */
function suggestName(slots: Slot[], picked: Record<string, string>, library: LibraryEffect[]) {
  return slots
    .flatMap((s) => library.find((e) => e.id === picked[s.id])?.name ?? [])
    .join(" + ");
}

/**
 * Effect combinations work like colourways: each picks one library effect for every effect slot of
 * the finish, and has its own selling and cost price. Shoppers pick one combination, or None.
 */
export default function EffectCombinationsManager({
  finishId,
  slots,
  library,
  combinations,
  blocked,
}: {
  finishId: string;
  slots: Slot[];
  library: LibraryEffect[];
  combinations: Combination[];
  /** Set while the finish form has unsaved changes. */
  blocked: string | null;
}) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [, run] = useActionRunner();
  const effectOf = (id?: string) => library.find((e) => e.id === id);
  const isComplete = (c: Combination) => slots.every((s) => c.effects[s.id]);
  const noSlots = slots.length === 0;

  const addButton = (
    <Button
      disabled={!!blocked || noSlots}
      onClick={() => setEditing({ name: "", sellingPrice: "0", costPrice: "", active: true, effects: {} })}
    >
      <Plus /> Add effect combination
    </Button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>Effect combinations</CardTitle>
          <CardDescription>
            Ready-made effect choices, one effect per slot, offered on every product with this finish. Shoppers pick
            one, or None. Prices are whole rupees per piece; the cost price is only shown here. Drag to reorder.
          </CardDescription>
        </div>
        {addButton}
      </CardHeader>
      <CardContent className="grid gap-3">
        {blocked && <p className="rounded-md bg-muted px-3 py-2 text-sm">{blocked}</p>}
        {noSlots && !blocked && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">Add an effect slot above and save the finish first.</p>
        )}
        {combinations.length === 0 ? (
          <EmptyState title="No effect combinations yet" description="Pick one effect per slot to make the first." />
        ) : (
          <SortableList
            items={combinations}
            disabled={!!blocked}
            onReorder={(ids) =>
              run(() => reorderEffectCombinations({ parentId: finishId, ids }), { success: "Order saved" })
            }
            renderItem={(c, handle) => {
              const margin = c.costPrice === null ? null : c.sellingPrice - c.costPrice;
              return (
                <div className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-3">
                  <DragHandle {...handle} />
                  <div className="flex -space-x-2">
                    {slots.map((s) => (
                      <EffectThumb key={s.id} url={effectOf(c.effects[s.id])?.imageUrl ?? null} className="size-9 ring-2 ring-card" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {!c.active && <Badge variant="secondary">Archived</Badge>}
                      {!isComplete(c) && <Badge variant="destructive">Missing an effect</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {slots.map((s) => (
                        <span key={s.id}>
                          {s.label}: {effectOf(c.effects[s.id])?.name ?? "—"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <div className="font-medium">+{formatPrice(c.sellingPrice)}</div>
                    <div className={margin !== null && margin < 0 ? "text-destructive" : "text-muted-foreground"}>
                      {c.costPrice === null ? "No cost price" : `Cost ${formatPrice(c.costPrice)} · Margin ${formatPrice(margin!)}`}
                    </div>
                  </div>
                  <Switch
                    checked={c.active}
                    disabled={!!blocked}
                    aria-label={c.active ? "Archive effect combination" : "Restore effect combination"}
                    onCheckedChange={(active) =>
                      run(() => setEffectCombinationActive({ id: c.id, active }), {
                        success: active ? "Effect combination restored" : "Effect combination archived",
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!!blocked}
                    aria-label={`Edit ${c.name}`}
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        name: c.name,
                        sellingPrice: String(c.sellingPrice),
                        costPrice: c.costPrice === null ? "" : String(c.costPrice),
                        active: c.active,
                        effects: c.effects,
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <ConfirmButton
                    label={`Delete ${c.name}`}
                    disabled={c.inUse || !!blocked}
                    title={`Delete ${c.name}?`}
                    description={
                      c.inUse
                        ? "Shoppers' carts hold it, so it can only be archived."
                        : "No cart holds it, so it can be removed for good."
                    }
                    onConfirm={() =>
                      run(() => deleteEffectCombination({ id: c.id }), { success: "Effect combination deleted" })
                    }
                  />
                </div>
              );
            }}
          />
        )}
        <p className="text-xs text-muted-foreground">
          A combination that carts hold can only be archived, never deleted. Archiving an effect in the{" "}
          <Link href="/admin/colours?tab=effects" className="underline underline-offset-4">
            effects library
          </Link>{" "}
          hides every combination that uses it.
        </p>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <CombinationForm
              key={editing.id ?? "new"}
              finishId={finishId}
              slots={slots}
              library={library}
              initial={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CombinationForm({
  finishId,
  slots,
  library,
  initial,
  onDone,
}: {
  finishId: string;
  slots: Slot[];
  library: LibraryEffect[];
  initial: Draft;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  // The name follows the effects until the admin types their own.
  const [nameTouched, setNameTouched] = useState(
    !!initial.id && initial.name !== suggestName(slots, initial.effects, library),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  const suggestion = suggestName(slots, draft.effects, library);
  const sell = Number(draft.sellingPrice);
  const cost = Number(draft.costPrice);
  const margin = draft.costPrice.trim() !== "" && Number.isFinite(sell) && Number.isFinite(cost) ? sell - cost : null;

  function pick(slotId: string, effectId: string) {
    const effects = { ...draft.effects, [slotId]: effectId };
    setDraft({ ...draft, effects, name: nameTouched ? draft.name : suggestName(slots, effects, library) });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = slots.filter((s) => !draft.effects[s.id]);
    if (missing.length) return setErrors({ effects: `Pick an effect for ${missing.map((s) => s.label).join(", ")}.` });
    const parsed = effectCombinationSchema.safeParse({
      id: draft.id,
      finishId,
      name: draft.name,
      sellingPrice: draft.sellingPrice.trim() === "" ? 0 : Number(draft.sellingPrice),
      costPrice: draft.costPrice.trim() === "" ? null : Number(draft.costPrice),
      active: draft.active,
      effects: slots.map((s) => ({ slotId: s.id, effectId: draft.effects[s.id] })),
    });
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveEffectCombination(parsed.data), {
      success: draft.id ? "Effect combination saved" : "Effect combination added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{draft.id ? "Edit effect combination" : "Add effect combination"}</DialogTitle>
        <DialogDescription>One effect per slot, and the price for the whole combination.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        {slots.map((s) => {
          // Archived effects stay pickable only where they're already used.
          const options = library.filter((e) => e.active || e.id === draft.effects[s.id]);
          return (
            <div key={s.id} className="grid gap-1">
              <Label htmlFor={`fx-slot-${s.id}`}>{s.label}</Label>
              <Select value={draft.effects[s.id] ?? ""} onValueChange={(v) => pick(s.id, v)}>
                <SelectTrigger id={`fx-slot-${s.id}`} className="w-full">
                  <SelectValue placeholder="Pick an effect" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <EffectThumb url={e.imageUrl} className="size-5" />
                      {e.name}
                      {!e.active && " (archived)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
        {library.length === 0 && (
          <p className="text-sm text-muted-foreground">
            The effects library is empty.{" "}
            <Link href="/admin/colours?tab=effects" className="underline underline-offset-4">
              Add effects
            </Link>{" "}
            first.
          </p>
        )}
        <FieldError message={errors.effects} />
      </div>

      <Field
        label="Name"
        htmlFor="fx-name"
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
            "Suggested from the effects; edit it if you like."
          )
        }
      >
        <Input
          id="fx-name"
          value={draft.name}
          onChange={(e) => {
            setNameTouched(true);
            setDraft({ ...draft, name: e.target.value });
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Selling price (₹ per piece)" htmlFor="fx-sell" error={errors.sellingPrice}>
          <Input
            id="fx-sell"
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.sellingPrice}
            onChange={(e) => setDraft({ ...draft, sellingPrice: e.target.value })}
          />
        </Field>
        <Field
          label="Cost price (₹, admin only)"
          htmlFor="fx-cost"
          error={errors.costPrice}
          hint={margin === null ? "Optional." : `Margin ₹${margin.toLocaleString("en-IN")} per piece.`}
        >
          <Input
            id="fx-cost"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="—"
            value={draft.costPrice}
            onChange={(e) => setDraft({ ...draft, costPrice: e.target.value })}
          />
        </Field>
      </div>
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
