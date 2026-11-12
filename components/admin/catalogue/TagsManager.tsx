"use client";

import { useState } from "react";
import { ImageOff, Pencil, Plus } from "lucide-react";
import type { AdminTag } from "@/lib/admin/queries/catalogue";
import { fieldErrorsOf, tagSchema } from "@/lib/admin/schemas/catalogue";
import { deleteTag, saveTag } from "@/lib/admin/tags";
import { slugify } from "@/lib/utils";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { Textarea } from "@/components/admin/ui/textarea";
import { ConfirmButton, EmptyState, Field, ImageField, SavingIcon, firstErrors, useActionRunner, type ImageValue } from "./shared";

type Draft = { id?: string; name: string; slug: string; blurb: string; image: ImageValue };

export default function TagsManager({ tags }: { tags: AdminTag[] }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [, run] = useActionRunner();

  const addButton = (
    <Button onClick={() => setEditing({ name: "", slug: "", blurb: "", image: null })}>
      <Plus /> Add tag
    </Button>
  );

  return (
    <div className="grid max-w-5xl gap-4">
      <div className="flex justify-end">{addButton}</div>
      {tags.length === 0 ? (
        <EmptyState
          title="No tags yet"
          description="Tags group products by occasion (Diwali, Housewarming) and feed search and similar products."
          action={addButton}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Blurb</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {t.imageUrl ? (
                        <img src={t.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageOff className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">/{t.slug}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">{t.blurb}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.products}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${t.name}`}
                        onClick={() =>
                          setEditing({
                            id: t.id,
                            name: t.name,
                            slug: t.slug,
                            blurb: t.blurb,
                            image: t.imageId && t.imageUrl ? { id: t.imageId, url: t.imageUrl } : null,
                          })
                        }
                      >
                        <Pencil />
                      </Button>
                      <ConfirmButton
                        label={`Delete ${t.name}`}
                        title={`Delete ${t.name}?`}
                        description={
                          t.products > 0
                            ? `It is removed from its ${t.products} product(s). The products themselves stay.`
                            : "No product has this tag."
                        }
                        onConfirm={() => run(() => deleteTag({ id: t.id }), { success: `${t.name} deleted` })}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && <TagForm key={editing.id ?? "new"} initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TagForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = tagSchema.safeParse({ id: d.id, name: d.name, slug: d.slug, blurb: d.blurb, imageId: d.image?.id ?? null });
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveTag(parsed.data), {
      success: d.id ? "Tag saved" : "Tag added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit tag" : "Add tag"}</DialogTitle>
        <DialogDescription>Occasion tags get their own page at /occasions/slug.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="tag-name" error={errors.name}>
          <Input
            id="tag-name"
            autoFocus
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) })}
          />
        </Field>
        <Field label="Slug" htmlFor="tag-slug" error={errors.slug}>
          <Input
            id="tag-slug"
            value={d.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setD({ ...d, slug: e.target.value });
            }}
          />
        </Field>
      </div>
      <Field label="Blurb" htmlFor="tag-blurb" error={errors.blurb}>
        <Textarea id="tag-blurb" rows={2} value={d.blurb} onChange={(e) => setD({ ...d, blurb: e.target.value })} />
      </Field>
      <Field label="Image" error={errors.imageId}>
        <ImageField value={d.image} onChange={(image) => setD({ ...d, image })} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}
