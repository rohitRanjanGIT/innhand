"use client";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ImageOff, Plus, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/admin/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";
import { Sortable } from "./Sortable";
import { FieldError, StatusBadge } from "./fields";
import type { ProductFormOptions, RelatedOption } from "@/lib/admin/queries/products";
import { imageUrl } from "@/lib/images";
import type { ProductInput } from "@/lib/validation/product";

export function RelatedTab({ options }: { options: ProductFormOptions }) {
  const { control, setValue, formState } = useFormContext<ProductInput>();
  const ids = useWatch({ control, name: "relatedIds" });
  const [open, setOpen] = useState(false);
  const byId = new Map(options.products.map((p) => [p.id, p]));
  const write = (next: string[]) => setValue("relatedIds", next, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const available = options.products.filter((p) => !ids.includes(p.id));

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Similar products</CardTitle>
          <CardDescription>
            Hand-picked products shown first under “You may also like”, in this order. The page fills the rest from the
            same sub-category, shared tags and the same head category, up to four.
          </CardDescription>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus /> Add product
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search products" />
              <CommandList>
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {available.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${p.slug}`}
                      onSelect={() => {
                        write([...ids, p.id]);
                        setOpen(false);
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
      </CardHeader>
      <CardContent>
        {ids.length === 0 ? (
          <p className="text-sm text-muted-foreground">None picked. The product page chooses similar products by itself.</p>
        ) : (
          <Sortable items={ids} getId={(id) => id} onReorder={write} className="space-y-2">
            {(id, i, handle) => {
              const p = byId.get(id);
              return (
                <div className="flex items-center gap-3 rounded-md border bg-card p-2">
                  {handle}
                  <span className="w-5 text-right text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                  {p ? <Thumb p={p} /> : <div className="size-10 rounded bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p?.name ?? "Removed product"}</div>
                    <div className="truncate text-xs text-muted-foreground">/{p?.slug}</div>
                  </div>
                  {p && p.status !== "active" && <StatusBadge status={p.status} />}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${p?.name ?? "product"}`}
                    onClick={() => write(ids.filter((x) => x !== id))}
                  >
                    <X />
                  </Button>
                </div>
              );
            }}
          </Sortable>
        )}
        <FieldError message={formState.errors.relatedIds?.message ?? formState.errors.relatedIds?.root?.message} />
      </CardContent>
    </Card>
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
