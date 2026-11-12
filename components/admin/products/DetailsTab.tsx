"use client";
import { useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Switch } from "@/components/admin/ui/switch";
import { Textarea } from "@/components/admin/ui/textarea";
import { CategorySelect } from "./CategorySelect";
import { FieldError, NumberField } from "./fields";
import { TagPicker } from "./TagPicker";
import { checkProductSlug } from "@/lib/admin/products";
import type { ProductFormOptions } from "@/lib/admin/queries/products";
import { slugify } from "@/lib/utils";
import type { ProductInput } from "@/lib/validation/product";

const STATUS_HELP: Record<string, string> = {
  draft: "Hidden from the shop while you work on it.",
  active: "Live in the shop.",
  archived: "Hidden from the shop; carts that have it keep working.",
};

export function DetailsTab({ productId, options }: { productId: string; options: ProductFormOptions }) {
  const { register, control, setValue, getValues, watch, formState, setError, clearErrors } = useFormContext<ProductInput>();
  const errors = formState.errors;
  const [slugTouched, setSlugTouched] = useState(() => getValues("slug") !== slugify(getValues("name")));
  const lastSets = useRef<number[]>(getValues("soldInSets") ? getValues("setSizes") : [2]);

  async function onSlugBlur() {
    const slug = getValues("slug");
    if (!slug) return;
    const res = await checkProductSlug({ slug, exceptId: productId });
    if (res.ok && res.data.taken) setError("slug", { message: "Another product already uses that slug." });
    else if (errors.slug?.message?.includes("already")) clearErrors("slug");
  }

  const status = watch("status");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Product</CardTitle>
          <CardDescription>What shoppers read on the product page and tiles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                aria-invalid={!!errors.name || undefined}
                {...register("name", {
                  onChange: (e) => {
                    if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldDirty: true });
                  },
                })}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-slug">Slug</Label>
              <Input
                id="p-slug"
                aria-invalid={!!errors.slug || undefined}
                {...register("slug", { onChange: () => setSlugTouched(true), onBlur: onSlugBlur })}
              />
              {slugTouched ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    setSlugTouched(false);
                    setValue("slug", slugify(getValues("name")), { shouldDirty: true, shouldValidate: true });
                  }}
                >
                  Make from name
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">Follows the name. Changing it changes the product's address.</p>
              )}
              <FieldError message={errors.slug?.message} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-category">Sub-category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <CategorySelect
                    id="p-category"
                    categories={options.categories}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!fieldState.error}
                  />
                )}
              />
              <FieldError message={errors.categoryId?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-tags">Tags</Label>
              <Controller
                control={control}
                name="tagIds"
                render={({ field }) => <TagPicker id="p-tags" tags={options.tags} value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-blurb">Blurb</Label>
            <Textarea id="p-blurb" rows={2} placeholder="One or two lines for tiles and the top of the page" {...register("blurb")} />
            <FieldError message={errors.blurb?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-description">Description</Label>
            <Textarea id="p-description" rows={7} {...register("description")} />
            <FieldError message={errors.description?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-size">Size</Label>
            <Input id="p-size" placeholder="e.g. 10 cm × 8 cm, holds a 6 cm plant" {...register("sizeText")} />
            <FieldError message={errors.sizeText?.message} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">{STATUS_HELP[status]}</p>
              <FieldError message={errors.status?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-featured">Featured rank</Label>
              <Controller
                control={control}
                name="featuredRank"
                render={({ field }) => (
                  <NumberField id="p-featured" placeholder="Not featured" value={field.value} onChange={field.onChange} />
                )}
              />
              <p className="text-xs text-muted-foreground">Shown on the home page; 1 comes first. Empty = not featured.</p>
              <FieldError message={errors.featuredRank?.message} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="p-limit">Cart limit</Label>
              <Controller
                control={control}
                name="cartLimit"
                render={({ field }) => (
                  <NumberField id="p-limit" placeholder="Store default" value={field.value} onChange={field.onChange} />
                )}
              />
              <p className="text-xs text-muted-foreground">Most pieces of this product one cart can hold, across all finishes.</p>
              <FieldError message={errors.cartLimit?.message} />
            </div>
            <Controller
              control={control}
              name="soldInSets"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="p-sets">Sold in sets</Label>
                    <p className="text-xs text-muted-foreground">Sets of 2, 3, 4… each with its own price (Pricing tab).</p>
                  </div>
                  <Switch
                    id="p-sets"
                    checked={field.value}
                    onCheckedChange={(on) => {
                      if (!on) lastSets.current = getValues("setSizes");
                      field.onChange(on);
                      setValue("setSizes", on ? (lastSets.current.length ? lastSets.current : [2]) : [1], {
                        shouldDirty: true,
                        shouldValidate: formState.isSubmitted,
                      });
                    }}
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="comboEligible"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="p-combo">Shopper-built combos</Label>
                    <p className="text-xs text-muted-foreground">Can be used in combos that shoppers build themselves.</p>
                  </div>
                  <Switch id="p-combo" checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
