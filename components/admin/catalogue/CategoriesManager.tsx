"use client";

import { useState } from "react";
import { ImageOff, Pencil, Plus } from "lucide-react";
import { deleteCategory, reorderCategories, saveCategory } from "@/lib/admin/categories";
import type { AdminCategory, AdminCategoryHead } from "@/lib/admin/queries/catalogue";
import { categorySchema, fieldErrorsOf } from "@/lib/admin/schemas/catalogue";
import { slugify } from "@/lib/utils";
import { DragHandle, SortableList, type DragHandleProps } from "@/components/admin/SortableList";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Switch } from "@/components/admin/ui/switch";
import { Textarea } from "@/components/admin/ui/textarea";
import {
  CollapseToggle,
  ColourInput,
  ConfirmButton,
  EmptyState,
  Field,
  ImageField,
  SavingIcon,
  firstErrors,
  useActionRunner,
  useCollapsed,
  type ImageValue,
} from "./shared";

type Draft = {
  id?: string;
  parentId: string | null;
  name: string;
  slug: string;
  blurb: string;
  image: ImageValue;
  bgColour: string;
  active: boolean;
};

const blank = (parentId: string | null): Draft => ({
  parentId,
  name: "",
  slug: "",
  blurb: "",
  image: null,
  bgColour: "#E1DAD3",
  active: true,
});

const toDraft = (c: AdminCategory): Draft => ({
  id: c.id,
  parentId: c.parentId,
  name: c.name,
  slug: c.slug,
  blurb: c.blurb,
  image: c.imageId && c.imageUrl ? { id: c.imageId, url: c.imageUrl } : null,
  bgColour: c.bgColour,
  active: c.active,
});

export default function CategoriesManager({ tree }: { tree: AdminCategoryHead[] }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [, run] = useActionRunner();
  const fold = useCollapsed();
  const headIds = tree.map((h) => h.id);

  const addHead = (
    <Button onClick={() => setEditing(blank(null))}>
      <Plus /> Add head category
    </Button>
  );

  function row(c: AdminCategory, handle: DragHandleProps, kids: number) {
    const isHead = !c.parentId;
    const blockReason =
      kids > 0
        ? "Move or delete its sub-categories first."
        : c.products > 0
          ? `${c.products} product(s) are in it, so it can only be deactivated.`
          : null;
    return (
      <div className="flex items-center gap-3 p-2 pr-3">
        <DragHandle {...handle} />
        {isHead && <CollapseToggle open={fold.isOpen(c.id)} onToggle={() => fold.toggle(c.id)} label={c.name} />}
        <div
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border"
          style={{ backgroundColor: c.bgColour }}
        >
          {c.imageUrl ? (
            <img src={c.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-4 text-black/30" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={isHead ? "font-semibold" : "font-medium"}>{c.name}</span>
            {!c.active && <Badge variant="secondary">Inactive</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            /{c.slug}
            {isHead ? ` · ${kids} sub-categor${kids === 1 ? "y" : "ies"}` : ` · ${c.products} product${c.products === 1 ? "" : "s"}`}
          </div>
        </div>
        <Switch
          checked={c.active}
          aria-label={c.active ? "Deactivate" : "Activate"}
          onCheckedChange={(active) =>
            run(
              () =>
                saveCategory({
                  id: c.id,
                  parentId: c.parentId,
                  name: c.name,
                  slug: c.slug,
                  blurb: c.blurb,
                  imageId: c.imageId,
                  bgColour: c.bgColour,
                  active,
                }),
              { success: active ? `${c.name} is live` : `${c.name} is hidden` },
            )
          }
        />
        {isHead && (
          <Button variant="ghost" size="icon-sm" aria-label={`Add a sub-category to ${c.name}`} title="Add sub-category" onClick={() => setEditing(blank(c.id))}>
            <Plus />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setEditing(toDraft(c))}>
          <Pencil />
        </Button>
        <span title={blockReason ?? undefined}>
          <ConfirmButton
            label={`Delete ${c.name}`}
            disabled={!!blockReason}
            title={`Delete ${c.name}?`}
            description="This can't be undone."
            onConfirm={() => run(() => deleteCategory({ id: c.id }), { success: `${c.name} deleted` })}
          />
        </span>
      </div>
    );
  }

  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex justify-end gap-2">
        {tree.length > 0 && (
          <Button variant="outline" onClick={() => fold.setAll(headIds, !fold.anyOpen(headIds))}>
            {fold.anyOpen(headIds) ? "Collapse all" : "Expand all"}
          </Button>
        )}
        {addHead}
      </div>
      {tree.length === 0 ? (
        <EmptyState title="No categories yet" description="Start with a head category such as Home Décor." action={addHead} />
      ) : (
        <SortableList
          items={tree}
          className="gap-3"
          onReorder={(ids) => run(() => reorderCategories({ parentId: null, ids }), { success: "Order saved" })}
          renderItem={(head, handle) => (
            <div className="rounded-lg border bg-card">
              {row(head, handle, head.children.length)}
              <div hidden={!fold.isOpen(head.id)} className="border-t bg-muted/30 py-2 pr-2 pl-10">
                {head.children.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">
                    No sub-categories.{" "}
                    <button type="button" className="underline underline-offset-4" onClick={() => setEditing(blank(head.id))}>
                      Add one
                    </button>
                  </p>
                ) : (
                  <SortableList
                    items={head.children}
                    className="gap-1"
                    itemClassName="rounded-md border bg-card"
                    onReorder={(ids) =>
                      run(() => reorderCategories({ parentId: head.id, ids }), { success: "Order saved" })
                    }
                    renderItem={(sub, subHandle) => row(sub, subHandle, 0)}
                  />
                )}
              </div>
            </div>
          )}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Two levels: head categories and their sub-categories. Products sit in sub-categories. A category with products
        can only be deactivated; a head category with sub-categories can&apos;t be deleted.
      </p>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <CategoryForm
              key={editing.id ?? `new-${editing.parentId}`}
              initial={editing}
              heads={tree}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({ initial, heads, onDone }: { initial: Draft; heads: AdminCategoryHead[]; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  const self = heads.find((h) => h.id === initial.id);
  const hasChildren = !!self && self.children.length > 0;
  const parentChoices = heads.filter((h) => h.id !== initial.id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = categorySchema.safeParse({
      id: d.id,
      parentId: d.parentId,
      name: d.name,
      slug: d.slug,
      blurb: d.blurb,
      imageId: d.image?.id ?? null,
      bgColour: d.bgColour,
      active: d.active,
    });
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveCategory(parsed.data), {
      success: d.id ? "Category saved" : "Category added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit category" : d.parentId ? "Add sub-category" : "Add head category"}</DialogTitle>
        <DialogDescription>Shown on the shop and category pages.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="cat-name" error={errors.name}>
          <Input
            id="cat-name"
            autoFocus
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) })}
          />
        </Field>
        <Field label="Slug" htmlFor="cat-slug" error={errors.slug}>
          <Input
            id="cat-slug"
            value={d.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setD({ ...d, slug: e.target.value });
            }}
          />
        </Field>
      </div>
      <Field
        label="Parent"
        htmlFor="cat-parent"
        error={errors.parentId}
        hint={hasChildren ? "It has sub-categories, so it stays a head category." : undefined}
      >
        <Select
          value={d.parentId ?? "none"}
          disabled={hasChildren}
          onValueChange={(v) => setD({ ...d, parentId: v === "none" ? null : v })}
        >
          <SelectTrigger id="cat-parent" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (head category)</SelectItem>
            {parentChoices.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Blurb" htmlFor="cat-blurb" error={errors.blurb}>
        <Textarea id="cat-blurb" rows={2} value={d.blurb} onChange={(e) => setD({ ...d, blurb: e.target.value })} />
      </Field>
      <Field label="Image" error={errors.imageId}>
        <ImageField value={d.image} onChange={(image) => setD({ ...d, image })} />
      </Field>
      <Field label="Background colour" htmlFor="cat-bg" error={errors.bgColour} hint="Behind the category tile.">
        <ColourInput id="cat-bg" value={d.bgColour} onChange={(bgColour) => setD({ ...d, bgColour })} invalid={!!errors.bgColour} />
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
