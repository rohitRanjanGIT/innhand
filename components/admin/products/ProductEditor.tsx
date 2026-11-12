"use client";
// The product editor: one react-hook-form across five tabs, saved by one Server Action
// (lib/admin/products.ts → saveProduct) in a single transaction.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/admin/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import { ConfirmButton } from "./ConfirmButton";
import { StatusBadge } from "./fields";
import { DetailsTab } from "./DetailsTab";
import { FinishesTab, type MediaInfo } from "./FinishesTab";
import { PricingTab } from "./PricingTab";
import { RelatedTab } from "./RelatedTab";
import { SeoTab } from "./SeoTab";
import { deleteProduct, saveProduct, setProductStatus } from "@/lib/admin/products";
import type { ProductEditorData, ProductFormOptions } from "@/lib/admin/queries/products";
import { productSchema, type ProductInput, type ProductValues } from "@/lib/validation/product";

const TAB_FIELDS: Record<string, (keyof ProductInput)[]> = {
  details: [
    "name",
    "slug",
    "categoryId",
    "tagIds",
    "blurb",
    "description",
    "sizeText",
    "cartLimit",
    "soldInSets",
    "comboEligible",
    "status",
    "featuredRank",
  ],
  finishes: ["finishes"],
  pricing: ["setSizes", "prices"],
  related: ["relatedIds"],
  seo: ["seoTitle", "seoDescription"],
};

export function ProductEditor({ data, options }: { data: ProductEditorData; options: ProductFormOptions }) {
  const router = useRouter();
  const form = useForm<ProductInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: data.values,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const [tab, setTab] = useState("details");
  const [busy, setBusy] = useState<null | "status" | "delete">(null);

  // Display info for every photo we know (saved ones + this session's uploads).
  const [mediaInfo, setMediaInfo] = useState<Record<string, MediaInfo>>(() => {
    const m: Record<string, MediaInfo> = {};
    for (const imgs of Object.values(data.imagesByFinish)) for (const i of imgs) m[i.mediaId] = { key: i.key, alt: i.alt };
    return m;
  });
  // Photos of unticked finishes, so ticking one again brings its photos back.
  const [stash, setStash] = useState<Record<string, ProductValues["finishes"][number]["images"]>>(() => {
    const s: Record<string, ProductValues["finishes"][number]["images"]> = {};
    for (const [finishId, imgs] of Object.entries(data.imagesByFinish))
      s[finishId] = imgs.map((i) => ({ mediaId: i.mediaId, colourwayId: i.colourwayId }));
    return s;
  });

  // Photos uploaded in this session; any not used at save time are cleaned up by the server.
  const [uploaded, setUploaded] = useState<string[]>([]);

  const { isDirty, isSubmitting, errors } = form.formState;
  const status = form.watch("status");
  const savedStatus = data.values.status;
  const name = form.watch("name");

  // Unsaved-changes warning when leaving the page.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Not memoised: react-hook-form mutates the errors object in place.
  const tabErrors: Record<string, boolean> = {};
  for (const [t, fields] of Object.entries(TAB_FIELDS)) tabErrors[t] = fields.some((f) => !!(errors as FieldErrors)[f]);

  const onSave = form.handleSubmit(
    async (values) => {
      const used = new Set(values.finishes.flatMap((f) => f.images.map((i) => i.mediaId)));
      const discardedMediaIds = uploaded.filter((m) => !used.has(m));
      const res = await saveProduct({ id: data.id, values, discardedMediaIds });
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, msgs] of Object.entries(res.fieldErrors)) {
            const path = k.replace(/^values\./, "") as FieldPath<ProductInput>;
            form.setError(path, { message: msgs[0] });
          }
        }
        toast.error(res.error);
        return;
      }
      form.reset(values);
      setUploaded([]); // the kept ones are saved now; later removals are cleaned up by the server
      toast.success("Product saved");
      router.refresh();
    },
    (errs) => {
      const first = Object.entries(TAB_FIELDS).find(([, fields]) => fields.some((f) => !!(errs as FieldErrors)[f]));
      if (first) setTab(first[0]);
      toast.error("Check the highlighted fields");
    },
  );

  async function changeStatus(next: "archived" | "draft" | "active") {
    if (isDirty) {
      toast.error("Save or discard your changes first");
      return;
    }
    setBusy("status");
    const res = await setProductStatus({ id: data.id, status: next });
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    form.reset({ ...form.getValues(), status: next });
    toast.success(next === "archived" ? "Product archived" : next === "active" ? "Product is live" : "Moved back to drafts");
    router.refresh();
  }

  async function onDelete() {
    setBusy("delete");
    const res = await deleteProduct({ id: data.id });
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    form.reset(form.getValues()); // no unsaved-changes prompt on the way out
    toast.success("Product deleted");
    router.replace("/admin/products");
    router.refresh();
  }

  const canDelete = savedStatus === "draft" && data.references.cartItems === 0 && data.references.comboItems === 0;
  const deleteHint =
    savedStatus !== "draft"
      ? "Only drafts can be deleted"
      : data.references.cartItems > 0
        ? "It's in a shopper's cart; archive it instead"
        : data.references.comboItems > 0
          ? "A combo uses it; archive it instead"
          : undefined;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSave}>
        <div className="mb-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link href="/admin/products">
              <ArrowLeft /> Products
            </Link>
          </Button>
        </div>
        <PageHeader
          title={name || "Untitled product"}
          description={`/products/${data.values.slug}`}
          actions={
            <>
              <div className="flex items-center">
                <StatusBadge status={savedStatus} />
              </div>
              {savedStatus === "active" && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/products/${data.values.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink /> View
                  </a>
                </Button>
              )}
              {savedStatus === "archived" ? (
                <Button variant="outline" size="sm" type="button" disabled={!!busy} onClick={() => changeStatus("draft")}>
                  {busy === "status" ? <Loader2 className="animate-spin" /> : <ArchiveRestore />} Restore to draft
                </Button>
              ) : (
                <ConfirmButton
                  title="Archive this product?"
                  description="It disappears from the shop, and combos that use it are hidden. Carts keep working. You can restore it later."
                  confirmLabel="Archive"
                  onConfirm={() => changeStatus("archived")}
                  disabled={!!busy}
                >
                  {busy === "status" ? <Loader2 className="animate-spin" /> : <Archive />} Archive
                </ConfirmButton>
              )}
              <ConfirmButton
                title="Delete this draft for good?"
                description="Its finishes, photos, prices and links are removed. This can't be undone."
                confirmLabel="Delete"
                destructive
                onConfirm={onDelete}
                disabled={!canDelete || !!busy}
                tooltip={deleteHint}
              >
                {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
              </ConfirmButton>
            </>
          }
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex h-auto flex-wrap">
            {[
              ["details", "Details"],
              ["finishes", "Finishes and images"],
              ["pricing", "Pricing"],
              ["related", "Similar products"],
              ["seo", "SEO"],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                {label}
                {tabErrors[value] && <span className="size-1.5 rounded-full bg-destructive" aria-label="has errors" />}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* forceMount keeps every tab's inputs registered, so validation covers all of them. */}
          <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
            <DetailsTab productId={data.id} options={options} />
          </TabsContent>
          <TabsContent value="finishes" forceMount className="data-[state=inactive]:hidden">
            <FinishesTab
              options={options}
              mediaInfo={mediaInfo}
              onMedia={(id, info) => {
                setMediaInfo((m) => ({ ...m, [id]: info }));
                setUploaded((u) => [...u, id]);
              }}
              stash={stash}
              onStash={(finishId, imgs) => setStash((s) => ({ ...s, [finishId]: imgs }))}
            />
          </TabsContent>
          <TabsContent value="pricing" forceMount className="data-[state=inactive]:hidden">
            <PricingTab options={options} />
          </TabsContent>
          <TabsContent value="related" forceMount className="data-[state=inactive]:hidden">
            <RelatedTab options={options} />
          </TabsContent>
          <TabsContent value="seo" forceMount className="data-[state=inactive]:hidden">
            <SeoTab />
          </TabsContent>
        </Tabs>

        {(isDirty || isSubmitting) && (
          <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t bg-background/95 backdrop-blur md:-mx-6">
            <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-6">
              <span className="mr-auto text-sm text-muted-foreground">
                Unsaved changes{status !== savedStatus ? ` · status will be ${status}` : ""}
              </span>
              <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => form.reset()}>
                Discard
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Save product
              </Button>
            </div>
          </div>
        )}
      </form>
    </FormProvider>
  );
}
