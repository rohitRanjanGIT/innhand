"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardFooter } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { CategorySelect } from "./CategorySelect";
import { FieldError } from "./fields";
import { createProduct } from "@/lib/admin/products";
import type { CategoryOption } from "@/lib/admin/queries/products";
import { slugify } from "@/lib/utils";
import { createProductSchema, type CreateProductInput } from "@/lib/validation/product";

export function NewProductForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(false);
  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { name: "", slug: "", categoryId: null },
  });
  const { register, handleSubmit, setValue, formState, control, setError } = form;

  const onSubmit = handleSubmit(async (values) => {
    const res = await createProduct(values);
    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [k, msgs] of Object.entries(res.fieldErrors))
          if (k === "name" || k === "slug" || k === "categoryId") setError(k, { message: msgs[0] });
      }
      if (/slug/i.test(res.error)) setError("slug", { message: res.error });
      toast.error(res.error);
      return;
    }
    toast.success("Draft created");
    router.push(`/admin/products/${res.data.id}`);
  });

  return (
    <form onSubmit={onSubmit} className="max-w-xl">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoFocus
              aria-invalid={!!formState.errors.name || undefined}
              {...register("name", {
                onChange: (e) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: formState.isSubmitted });
                },
              })}
            />
            <FieldError message={formState.errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              aria-invalid={!!formState.errors.slug || undefined}
              {...register("slug", { onChange: () => setSlugTouched(true) })}
            />
            <p className="text-xs text-muted-foreground">The product's address: /products/{form.watch("slug") || "…"}</p>
            <FieldError message={formState.errors.slug?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Sub-category</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <CategorySelect
                  id="category"
                  categories={categories}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                />
              )}
            />
            <FieldError message={formState.errors.categoryId?.message} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting && <Loader2 className="animate-spin" />}
            Create draft
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
