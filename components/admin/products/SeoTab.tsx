"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { FieldError } from "./fields";
import { cn } from "@/lib/utils";
import type { ProductInput } from "@/lib/validation/product";

const TITLE_SOFT = 60;
const DESC_SOFT = 160;

export function SeoTab() {
  const { register, control, formState } = useFormContext<ProductInput>();
  const [seoTitle, seoDescription, name, blurb, slug] = useWatch({
    control,
    name: ["seoTitle", "seoDescription", "name", "blurb", "slug"],
  });
  const title = seoTitle.trim() || name.trim() || "Product name";
  const description = seoDescription.trim() || blurb.trim() || "A short description of the product.";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Search engines</CardTitle>
          <CardDescription>Leave empty to use the product name and blurb.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="seo-title">SEO title</Label>
              <Counter n={seoTitle.length} soft={TITLE_SOFT} />
            </div>
            <Input id="seo-title" placeholder={name} {...register("seoTitle")} />
            <FieldError message={formState.errors.seoTitle?.message} />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="seo-desc">SEO description</Label>
              <Counter n={seoDescription.length} soft={DESC_SOFT} />
            </div>
            <Textarea id="seo-desc" rows={4} placeholder={blurb} {...register("seoDescription")} />
            <FieldError message={formState.errors.seoDescription?.message} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Roughly how a search result could look.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white p-4 text-left dark:bg-zinc-950">
            <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">innhandcreations › products › {slug || "…"}</div>
            <div className="mt-1 line-clamp-1 text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{truncate(title, TITLE_SOFT)}</div>
            <div className="mt-1 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">{truncate(description, DESC_SOFT)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Counter({ n, soft }: { n: number; soft: number }) {
  return <span className={cn("text-xs tabular-nums", n > soft ? "text-amber-600" : "text-muted-foreground")}>{n}/{soft}</span>;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}
