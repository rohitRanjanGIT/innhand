"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { createFinish, deleteFinish, reorderFinishes } from "@/lib/admin/finishes";
import type { AdminFinishRow } from "@/lib/admin/queries/finishes";
import { fieldErrorsOf, finishCreateSchema } from "@/lib/admin/schemas/catalogue";
import { slugify } from "@/lib/utils";
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
import { ConfirmButton, EmptyState, Field, SavingIcon, firstErrors, useActionRunner } from "./shared";

export default function FinishesList({ finishes, scc, sec }: { finishes: AdminFinishRow[]; scc: number; sec: number }) {
  const [creating, setCreating] = useState(false);
  const [, run] = useActionRunner();

  const addButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus /> New finish
    </Button>
  );

  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Each finish may have up to <strong>{scc}</strong> secondary colour{scc === 1 ? "" : "s"} and{" "}
          <strong>{sec}</strong> effect{sec === 1 ? "" : "s"}.{" "}
          <Link href="/admin/settings" className="underline underline-offset-4">
            Change limits
          </Link>
        </p>
        {addButton}
      </div>

      {finishes.length === 0 ? (
        <EmptyState title="No finishes yet" description="Create Matte, Marble, Terrazzo and the rest." action={addButton} />
      ) : (
        <SortableList
          items={finishes}
          onReorder={(ids) => run(() => reorderFinishes({ ids }), { success: "Order saved" })}
          renderItem={(f, handle) => (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-3">
              <DragHandle {...handle} />
              <Link href={`/admin/finishes/${f.id}`} className="group min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium group-hover:underline">{f.name}</span>
                  {!f.active && <Badge variant="secondary">Archived</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {1 + f.secondarySlots} colour slot{f.secondarySlots === 0 ? "" : "s"} · {f.effectSlots} effect
                  {f.effectSlots === 1 ? "" : "s"} · {f.colourways} colourway{f.colourways === 1 ? "" : "s"} ·{" "}
                  {f.products} product{f.products === 1 ? "" : "s"}
                </div>
              </Link>
              <ConfirmButton
                label={`Delete ${f.name}`}
                disabled={f.products > 0}
                title={`Delete ${f.name}?`}
                description="Its slots, effects and colourways are deleted too. No product uses it."
                onConfirm={() => run(() => deleteFinish({ id: f.id }), { success: `${f.name} deleted` })}
              />
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href={`/admin/finishes/${f.id}`} aria-label={`Edit ${f.name}`}>
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          )}
        />
      )}
      <p className="text-xs text-muted-foreground">
        A finish that products use can only be archived (in its editor), so carts never break.
      </p>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>{creating && <NewFinishForm />}</DialogContent>
      </Dialog>
    </div>
  );
}

function NewFinishForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = finishCreateSchema.safeParse({ name, slug });
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => createFinish(parsed.data), {
      success: "Finish created",
      onSuccess: ({ id }) => router.push(`/admin/finishes/${id}`),
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>New finish</DialogTitle>
        <DialogDescription>You&apos;ll add its colour slots, effects and colourways next.</DialogDescription>
      </DialogHeader>
      <Field label="Name" htmlFor="finish-name" error={errors.name}>
        <Input
          id="finish-name"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      <Field label="Slug" htmlFor="finish-slug" error={errors.slug}>
        <Input
          id="finish-slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Create
        </Button>
      </DialogFooter>
    </form>
  );
}
