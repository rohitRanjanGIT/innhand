"use client";

import { useState } from "react";
import { ImageOff, Pencil, Plus, X } from "lucide-react";
import type { AdminTag } from "@/lib/admin/queries/catalogue";
import type { RelatedOption } from "@/lib/admin/queries/products";
import { fieldErrorsOf, tagSchema } from "@/lib/admin/schemas/catalogue";
import { addTagProduct, deleteTag, removeTagProduct, reorderTags, saveTag } from "@/lib/admin/tags";
import { imageUrl } from "@/lib/images";
import { slugify } from "@/lib/utils";
import { DragHandle, SortableList } from "@/components/admin/SortableList";
import { StatusBadge } from "@/components/admin/products/fields";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/admin/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";
import { Input } from "@/components/admin/ui/input";
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
  name: string;
  slug: string;
  blurb: string;
  image: ImageValue;
  bgColour: string;
  active: boolean;
};

const blank = (): Draft => ({ name: "", slug: "", blurb: "", image: null, bgColour: "#E1DAD3", active: true });

const toDraft = (o: AdminTag): Draft => ({
  id: o.id,
  name: o.name,
  slug: o.slug,
  blurb: o.blurb,
  image: o.imageId && o.imageUrl ? { id: o.imageId, url: o.imageUrl } : null,
  bgColour: o.bgColour,
  active: o.active,
});

export default function OccasionsManager({
  occasions,
  products,
  productIds,
}: {
  occasions: AdminTag[];
  products: RelatedOption[];
  productIds: Record<string, string[]>;
}) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [, run] = useActionRunner();
  const fold = useCollapsed();
  const allIds = occasions.map((o) => o.id);
  const byId = new Map(products.map((p) => [p.id, p]));

  const addButton = (
    <Button onClick={() => setEditing(blank())}>
      <Plus /> Add occasion
    </Button>
  );

  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex justify-end gap-2">
        {occasions.length > 0 && (
          <Button variant="outline" onClick={() => fold.setAll(allIds, !fold.anyOpen(allIds))}>
            {fold.anyOpen(allIds) ? "Collapse all" : "Expand all"}
          </Button>
        )}
        {addButton}
      </div>
      {occasions.length === 0 ? (
        <EmptyState
          title="No occasions yet"
          description="Occasions group products by celebration (Diwali, Housewarming) and feed search and similar products."
          action={addButton}
        />
      ) : (
        <SortableList
          items={occasions}
          className="gap-3"
          onReorder={(ids) => run(() => reorderTags({ ids }), { success: "Order saved" })}
          renderItem={(o, handle) => {
            const items = (productIds[o.id] ?? []).flatMap((id) => {
              const p = byId.get(id);
              return p ? [p] : [];
            });
            const blockReason = o.products > 0 ? `${o.products} product(s) are in it, so it can only be deactivated.` : null;
            return (
              <div className="rounded-lg border bg-card">
                <div className="flex items-center gap-3 p-2 pr-3">
                  <DragHandle {...handle} />
                  <CollapseToggle open={fold.isOpen(o.id)} onToggle={() => fold.toggle(o.id)} label={o.name} />
                  <div
                    className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border"
                    style={{ backgroundColor: o.bgColour }}
                  >
                    {o.imageUrl ? (
                      <img src={o.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-4 text-black/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{o.name}</span>
                      {!o.active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      /{o.slug} · {o.products} product{o.products === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Switch
                    checked={o.active}
                    aria-label={o.active ? "Deactivate" : "Activate"}
                    onCheckedChange={(active) =>
                      run(
                        () =>
                          saveTag({
                            id: o.id,
                            name: o.name,
                            slug: o.slug,
                            blurb: o.blurb,
                            imageId: o.imageId,
                            bgColour: o.bgColour,
                            active,
                          }),
                        { success: active ? `${o.name} is live` : `${o.name} is hidden` },
                      )
                    }
                  />
                  <AddProduct occasion={o} products={products} taken={items.map((p) => p.id)} run={run} />
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${o.name}`} onClick={() => setEditing(toDraft(o))}>
                    <Pencil />
                  </Button>
                  <span title={blockReason ?? undefined}>
                    <ConfirmButton
                      label={`Delete ${o.name}`}
                      disabled={!!blockReason}
                      title={`Delete ${o.name}?`}
                      description="This can't be undone."
                      onConfirm={() => run(() => deleteTag({ id: o.id }), { success: `${o.name} deleted` })}
                    />
                  </span>
                </div>
                <div hidden={!fold.isOpen(o.id)} className="border-t bg-muted/30 py-2 pr-2 pl-10">
                  {items.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                      No products.{" "}
                      <AddProduct occasion={o} products={products} taken={[]} run={run} asLink />
                    </p>
                  ) : (
                    <ul className="grid gap-1">
                      {items.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 rounded-md border bg-card p-2 pr-3">
                          <Thumb p={p} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{p.name}</div>
                            <div className="truncate text-xs text-muted-foreground">/{p.slug}</div>
                          </div>
                          {p.status !== "active" && <StatusBadge status={p.status} />}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${p.name} from ${o.name}`}
                            title="Remove from this occasion"
                            onClick={() =>
                              run(() => removeTagProduct({ id: o.id, productId: p.id }), {
                                success: `${p.name} removed from ${o.name}`,
                              })
                            }
                          >
                            <X />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          }}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Products can be added to an occasion here or from the product&apos;s own page. An occasion with products can only
        be deactivated. Inactive occasions are hidden from the shop and the menu.
      </p>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && <OccasionForm key={editing.id ?? "new"} initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A "+" on the occasion's row (or the "Add one" link when empty) that picks a product to add. */
function AddProduct({
  occasion,
  products,
  taken,
  run,
  asLink,
}: {
  occasion: AdminTag;
  products: RelatedOption[];
  taken: string[];
  run: ReturnType<typeof useActionRunner>[1];
  asLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const available = products.filter((p) => !taken.includes(p.id));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {asLink ? (
          <button type="button" className="underline underline-offset-4">
            Add one
          </button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={`Add a product to ${occasion.name}`} title="Add product">
            <Plus />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search products" />
          <CommandList>
            <CommandEmpty>{available.length === 0 ? "Every product is already in it." : "No products found."}</CommandEmpty>
            <CommandGroup>
              {available.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.slug}`}
                  onSelect={() => {
                    setOpen(false);
                    run(() => addTagProduct({ id: occasion.id, productId: p.id }), {
                      success: `${p.name} added to ${occasion.name}`,
                    });
                  }}
                >
                  <Thumb p={p} small />
                  <span className="truncate">{p.name}</span>
                  {p.status !== "active" && <span className="ml-auto text-xs text-muted-foreground">{p.status}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Thumb({ p, small }: { p: RelatedOption; small?: boolean }) {
  const size = small ? "size-6" : "size-10";
  if (!p.thumbKey)
    return (
      <div className={`${size} flex shrink-0 items-center justify-center rounded bg-muted text-muted-foreground`}>
        <ImageOff className="size-3.5" />
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl(p.thumbKey, "thumb")} alt="" className={`${size} shrink-0 rounded object-cover`} />;
}

function OccasionForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = tagSchema.safeParse({
      id: d.id,
      name: d.name,
      slug: d.slug,
      blurb: d.blurb,
      imageId: d.image?.id ?? null,
      bgColour: d.bgColour,
      active: d.active,
    });
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveTag(parsed.data), {
      success: d.id ? "Occasion saved" : "Occasion added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit occasion" : "Add occasion"}</DialogTitle>
        <DialogDescription>Each occasion gets its own page at /occasions/slug.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="occ-name" error={errors.name}>
          <Input
            id="occ-name"
            autoFocus
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) })}
          />
        </Field>
        <Field label="Slug" htmlFor="occ-slug" error={errors.slug}>
          <Input
            id="occ-slug"
            value={d.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setD({ ...d, slug: e.target.value });
            }}
          />
        </Field>
      </div>
      <Field label="Blurb" htmlFor="occ-blurb" error={errors.blurb}>
        <Textarea id="occ-blurb" rows={2} value={d.blurb} onChange={(e) => setD({ ...d, blurb: e.target.value })} />
      </Field>
      <Field label="Image" error={errors.imageId}>
        <ImageField value={d.image} onChange={(image) => setD({ ...d, image })} />
      </Field>
      <Field label="Background colour" htmlFor="occ-bg" error={errors.bgColour} hint="Behind the occasion tile.">
        <ColourInput id="occ-bg" value={d.bgColour} onChange={(bgColour) => setD({ ...d, bgColour })} invalid={!!errors.bgColour} />
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
