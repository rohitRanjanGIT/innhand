"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Plus, Trash2, Wand2 } from "lucide-react";
import { saveFinish } from "@/lib/admin/finishes";
import type { FinishEditorData } from "@/lib/admin/queries/finishes";
import { fieldErrorsOf, finishSaveSchema, type FinishSaveInput } from "@/lib/admin/schemas/catalogue";
import { slugify } from "@/lib/utils";
import { DragHandle, SortableList } from "@/components/admin/SortableList";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Textarea } from "@/components/admin/ui/textarea";
import ColourwaysManager from "./ColourwaysManager";
import { Field, FieldError, SavingIcon, firstErrors, useActionRunner } from "./shared";

// Local form state. `key` is a stable React/drag key; `id` is the saved row's id (absent when new).
type Opt = { key: string; id?: string; name: string; extraPrice: string; active: boolean; inCarts: boolean };
type EffectSlot = { key: string; id?: string; label: string; required: boolean; options: Opt[] };
type ColourSlot = { key: string; id?: string; label: string };
type State = {
  name: string;
  slug: string;
  description: string;
  active: boolean;
  colourSlots: ColourSlot[];
  effectSlots: EffectSlot[];
};

let tmp = 0;
const newKey = () => `new-${++tmp}`;

function fromData(f: FinishEditorData["finish"]): State {
  return {
    name: f.name,
    slug: f.slug,
    description: f.description,
    active: f.active,
    colourSlots: f.colourSlots.map((s) => ({ key: s.id, id: s.id, label: s.label })),
    effectSlots: f.effectSlots.map((s) => ({
      key: s.id,
      id: s.id,
      label: s.label,
      required: s.required,
      options: s.options.map((o) => ({ key: o.id, ...o, extraPrice: String(o.extraPrice) })),
    })),
  };
}

function toInput(id: string, s: State): FinishSaveInput {
  return {
    id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    active: s.active,
    colourSlots: s.colourSlots.map(({ id, label }) => ({ id, label })),
    effectSlots: s.effectSlots.map(({ id, label, required, options }) => ({
      id,
      label,
      required,
      options: options.map(({ id, name, extraPrice, active }) => ({
        id,
        name,
        extraPrice: extraPrice.trim() === "" ? 0 : Number(extraPrice),
        active,
      })),
    })),
  };
}

export default function FinishEditor({ data }: { data: FinishEditorData }) {
  const { finish, scc, sec } = data;
  const [state, setState] = useState(() => fromData(finish));
  const [initial, setInitial] = useState(finish);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  // After a save the page re-renders with fresh rows (new slots now have ids): start from those.
  if (initial !== finish) {
    setInitial(finish);
    setState(fromData(finish));
  }

  const dirty = JSON.stringify(toInput(finish.id, state)) !== JSON.stringify(toInput(finish.id, fromData(finish)));
  const secondary = state.colourSlots.length - 1;
  const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const setColourSlot = (i: number, label: string) =>
    update({ colourSlots: state.colourSlots.map((s, j) => (j === i ? { ...s, label } : s)) });
  const setEffect = (i: number, patch: Partial<EffectSlot>) =>
    update({ effectSlots: state.effectSlots.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setOption = (i: number, k: number, patch: Partial<Opt>) =>
    setEffect(i, { options: state.effectSlots[i].options.map((o, j) => (j === k ? { ...o, ...patch } : o)) });

  function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = finishSaveSchema.safeParse(toInput(finish.id, state));
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setErrors({});
    run(() => saveFinish(parsed.data), {
      success: "Finish saved",
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <div className="grid max-w-4xl gap-6">
      <form onSubmit={save} className="grid gap-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" error={errors.name}>
              <Input id="name" value={state.name} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Field label="Slug" htmlFor="slug" error={errors.slug}>
              <div className="flex gap-2">
                <Input id="slug" value={state.slug} onChange={(e) => update({ slug: e.target.value })} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Make slug from name"
                  title="Make slug from name"
                  onClick={() => update({ slug: slugify(state.name) })}
                >
                  <Wand2 />
                </Button>
              </div>
            </Field>
            <Field label="Description" htmlFor="description" error={errors.description} className="sm:col-span-2">
              <Textarea
                id="description"
                rows={3}
                value={state.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Switch checked={state.active} onCheckedChange={(active) => update({ active })} />
              Active
              <span className="text-muted-foreground">
                {state.active ? "— offered on products" : "— archived: hidden from shoppers, carts keep working"}
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colour slots</CardTitle>
            <CardDescription>
              The base colour always exists. Up to {scc} secondary colour{scc === 1 ? "" : "s"} (
              <Link href="/admin/settings" className="underline underline-offset-4">
                SCC
              </Link>
              ). Removing a slot removes its colour from every colourway of this finish.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {state.colourSlots.map((slot, i) => (
              <div key={slot.key} className="grid gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant={i === 0 ? "default" : "outline"} className="w-24 justify-center">
                    {i === 0 ? "Base" : `Secondary ${i}`}
                  </Badge>
                  <Input
                    aria-label={i === 0 ? "Base colour label" : `Secondary colour ${i} label`}
                    value={slot.label}
                    placeholder={i === 0 ? "Base colour" : "e.g. Swirl colour"}
                    onChange={(e) => setColourSlot(i, e.target.value)}
                    className="max-w-sm"
                  />
                  {i === 0 ? (
                    <span className="inline-flex size-8 items-center justify-center text-muted-foreground" title="Always present">
                      <Lock className="size-4" />
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${slot.label || "slot"}`}
                      onClick={() => update({ colourSlots: state.colourSlots.filter((_, j) => j !== i) })}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <FieldError message={errors[`colourSlots.${i}.label`]} />
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={secondary >= scc}
                onClick={() => update({ colourSlots: [...state.colourSlots, { key: newKey(), label: "" }] })}
              >
                <Plus /> Add secondary colour
              </Button>
              {secondary >= scc && (
                <span className="ml-3 text-xs text-muted-foreground">Limit of {scc} reached.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Effects</CardTitle>
            <CardDescription>
              The shopper picks one option of each effect (&quot;Flakes&quot;: None, Gold leaf…). Extra price is in
              rupees per piece. Up to {sec} effect{sec === 1 ? "" : "s"} (
              <Link href="/admin/settings" className="underline underline-offset-4">
                SEC
              </Link>
              ).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {state.effectSlots.length === 0 && <p className="text-sm text-muted-foreground">No effects on this finish.</p>}
            {state.effectSlots.map((slot, i) => {
              const locked = slot.options.some((o) => o.inCarts);
              return (
                <div key={slot.key} className="grid gap-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      aria-label="Effect label"
                      placeholder="e.g. Flakes"
                      value={slot.label}
                      onChange={(e) => setEffect(i, { label: e.target.value })}
                      className="max-w-xs"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={slot.required} onCheckedChange={(v) => setEffect(i, { required: v === true })} />
                      Shopper must pick one
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      disabled={locked}
                      title={locked ? "Options of this effect are in shoppers' carts" : undefined}
                      onClick={() => update({ effectSlots: state.effectSlots.filter((_, j) => j !== i) })}
                    >
                      <Trash2 /> Remove effect
                    </Button>
                  </div>
                  <FieldError message={errors[`effectSlots.${i}.label`]} />

                  {slot.options.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No options yet.</p>
                  ) : (
                    <SortableList
                      items={slot.options.map((o) => ({ ...o, id: o.key }))}
                      onReorder={(keys) =>
                        setEffect(i, { options: keys.map((k) => slot.options.find((o) => o.key === k)!) })
                      }
                      renderItem={(o, handle, { index: k }) => (
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <DragHandle {...handle} />
                            <Input
                              aria-label="Option name"
                              placeholder="e.g. Gold leaf"
                              value={o.name}
                              onChange={(e) => setOption(i, k, { name: e.target.value })}
                              className="max-w-56"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">+₹</span>
                              <Input
                                aria-label="Extra price in rupees"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={o.extraPrice}
                                onChange={(e) => setOption(i, k, { extraPrice: e.target.value })}
                                className="w-24"
                              />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <Switch checked={o.active} onCheckedChange={(active) => setOption(i, k, { active })} />
                              Active
                            </label>
                            {o.inCarts ? (
                              <Badge variant="outline" title="In shoppers' carts: archive it instead of removing">
                                In carts
                              </Badge>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${o.name || "option"}`}
                                onClick={() => setEffect(i, { options: slot.options.filter((_, j) => j !== k) })}
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                          <FieldError
                            message={
                              errors[`effectSlots.${i}.options.${k}.name`] ??
                              errors[`effectSlots.${i}.options.${k}.extraPrice`]
                            }
                          />
                        </div>
                      )}
                    />
                  )}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEffect(i, {
                          options: [
                            ...slot.options,
                            { key: newKey(), name: "", extraPrice: "0", active: true, inCarts: false },
                          ],
                        })
                      }
                    >
                      <Plus /> Add option
                    </Button>
                  </div>
                </div>
              );
            })}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.effectSlots.length >= sec}
                onClick={() =>
                  update({
                    effectSlots: [
                      ...state.effectSlots,
                      {
                        key: newKey(),
                        label: "",
                        required: false,
                        options: [{ key: newKey(), name: "None", extraPrice: "0", active: true, inCarts: false }],
                      },
                    ],
                  })
                }
              >
                <Plus /> Add effect
              </Button>
              {state.effectSlots.length >= sec && (
                <span className="ml-3 text-xs text-muted-foreground">Limit of {sec} reached.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-1 flex items-center gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
          <Button type="submit" disabled={pending || !dirty}>
            <SavingIcon pending={pending} /> Save finish
          </Button>
          {dirty ? (
            <>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setState(fromData(finish))}>
                Discard changes
              </Button>
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">All changes saved</span>
          )}
          {errors._ && <FieldError message={errors._} />}
        </div>
      </form>

      <ColourwaysManager
        finishId={finish.id}
        slots={finish.colourSlots}
        palette={data.palette}
        colourways={data.colourways}
        blocked={dirty ? "Save the finish first: colourways use the saved colour slots." : null}
      />
    </div>
  );
}
