"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/admin/ui/alert-dialog";
import ImageUploader, { type UploadedImage } from "@/components/admin/ImageUploader";
import { deleteCombo, saveCombo } from "@/lib/admin/combos";
import { formatPrice, savingFromComboPrice, type Discount } from "@/lib/pricing";
import { slugify } from "@/lib/utils";
import { adminComboPricing, adminPiecePrice, type AdminComboProduct } from "./pricing";

type Status = "draft" | "active" | "archived";

export type ComboEditorInitial = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: Status;
  sort: number;
  discountType: "amount" | "percent";
  discountValue: number;
  items: { productId: string; productFinishId: string | null; setSize: number }[];
  images: UploadedImage[];
};

type Item = { key: string; productId: string; productFinishId: string | null; setSize: number };

let keySeq = 0;
const newKey = () => `i${++keySeq}`;

function setLabel(n: number) {
  return n === 1 ? "Single piece" : `Set of ${n}`;
}

/** The defaults a freshly picked product starts on: its default finish and first priced set size. */
function defaultsFor(p: AdminComboProduct | undefined) {
  const f = p?.finishes.find((x) => x.isDefault && x.active) ?? p?.finishes.find((x) => x.active) ?? p?.finishes[0];
  const v = f?.variants.find((x) => x.active && x.price !== null) ?? f?.variants[0];
  return { productFinishId: f?.productFinishId ?? null, setSize: v?.setSize ?? 1 };
}

export default function ComboEditor({
  products,
  initial,
}: {
  products: AdminComboProduct[];
  initial?: ComboEditorInitial;
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<Status>(initial?.status ?? "draft");
  const [sort, setSort] = useState(String(initial?.sort ?? 0));
  const [items, setItems] = useState<Item[]>(
    () => initial?.items.map((i) => ({ ...i, key: newKey() })) ?? [],
  );
  const [images, setImages] = useState<UploadedImage[]>(initial?.images ?? []);

  // Pricing: the admin types a combo price (stored as an amount saving) or a percentage.
  const [mode, setMode] = useState<"price" | "percent">(initial?.discountType === "percent" ? "percent" : "price");
  const [percent, setPercent] = useState(initial?.discountType === "percent" ? String(initial.discountValue) : "10");
  const [comboPrice, setComboPrice] = useState(() => {
    if (!initial || initial.discountType !== "amount") return "";
    const base = adminComboPricing(initial.items, byId, { type: "amount", value: 0 }).piecesTotal;
    return String(Math.max(0, base - initial.discountValue));
  });

  const base = adminComboPricing(items, byId, { type: "amount", value: 0 });
  const allPriced = items.every((i) => adminPiecePrice(i, byId.get(i.productId)).price !== null);
  const priceNum = comboPrice.trim() === "" ? null : Math.round(Number(comboPrice));
  const percentNum = Math.round(Number(percent));
  const discount: Discount | null =
    mode === "percent"
      ? Number.isFinite(percentNum)
        ? { type: "percent", value: percentNum }
        : null
      : priceNum !== null && Number.isFinite(priceNum)
        ? { type: "amount", value: savingFromComboPrice(base.piecesTotal, priceNum) }
        : null;
  const live = adminComboPricing(items, byId, discount ?? { type: "amount", value: 0 });

  function updateItem(key: string, patch: Partial<Item>) {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }
  function move<T>(list: T[], from: number, to: number) {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    return next;
  }
  function addPiece() {
    const first = products.find((p) => p.status === "active" && !items.some((i) => i.productId === p.id));
    if (!first) return;
    setItems((list) => [...list, { key: newKey(), productId: first.id, ...defaultsFor(first) }]);
  }

  function save() {
    if (!discount) return toast.error(mode === "percent" ? "Enter the percentage off." : "Enter the combo price.");
    if (mode === "price" && !allPriced)
      return toast.error("Every piece needs a price before the saving can be worked out. Fix the pieces or use a percentage.");
    if (mode === "price" && priceNum !== null && priceNum > base.piecesTotal)
      return toast.error("The combo price is more than the pieces cost on their own.");
    if (items.some((i) => !i.productFinishId)) return toast.error("Pick a finish for every piece.");
    startTransition(async () => {
      const res = await saveCombo({
        id: initial?.id,
        name,
        slug: slug || slugify(name),
        description,
        status,
        sort: Math.round(Number(sort) || 0),
        discountType: discount.type,
        discountValue: discount.value,
        items: items.map((i) => ({ productId: i.productId, productFinishId: i.productFinishId!, setSize: i.setSize })),
        imageIds: images.map((i) => i.id),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Combo saved");
      setSlug(res.data.slug);
      if (!initial) router.replace(`/admin/combos/${res.data.id}`);
      else router.refresh();
    });
  }

  function remove() {
    if (!initial) return;
    startTransition(async () => {
      const res = await deleteCombo({ id: initial.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Combo deleted");
      router.replace("/admin/combos");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="combo-name">Name</Label>
              <Input
                id="combo-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="Lotus Light Set"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="combo-slug">Slug</Label>
              <Input
                id="combo-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onBlur={() => setSlug((s) => slugify(s))}
              />
              <p className="text-xs text-muted-foreground">/combos/{slug || slugify(name) || "…"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="combo-sort">Sort</Label>
                <Input id="combo-sort" type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="combo-desc">Description</Label>
              <Textarea
                id="combo-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pieces</CardTitle>
            <CardDescription>
              2 to 4 catalogue products. The finish and set size here are what the shopper starts on; they can change
              finish and colours on the combo page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {items.length === 0 && <p className="text-sm text-muted-foreground">No pieces yet.</p>}
            {items.map((it, n) => {
              const p = byId.get(it.productId);
              const f = p?.finishes.find((x) => x.productFinishId === it.productFinishId);
              const piece = adminPiecePrice(it, p);
              return (
                <div key={it.key} className="flex flex-col gap-3 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Piece {n + 1}</span>
                    <div className="flex items-center gap-1">
                      <span className="mr-2 text-sm tabular-nums">
                        {piece.price === null ? (
                          <span className="text-destructive">{piece.reason}</span>
                        ) : (
                          formatPrice(piece.price)
                        )}
                      </span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Move up"
                        disabled={n === 0}
                        onClick={() => setItems((l) => move(l, n, n - 1))}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Move down"
                        disabled={n === items.length - 1}
                        onClick={() => setItems((l) => move(l, n, n + 1))}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Remove piece"
                        onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Product</Label>
                      <Select
                        value={it.productId}
                        onValueChange={(id) => updateItem(it.key, { productId: id, ...defaultsFor(byId.get(id)) })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((x) => (
                            <SelectItem key={x.id} value={x.id}>
                              {x.name}
                              {x.status !== "active" ? ` (${x.status})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Default finish</Label>
                      <Select
                        value={it.productFinishId ?? undefined}
                        onValueChange={(pfId) => {
                          const nf = p?.finishes.find((x) => x.productFinishId === pfId);
                          const keep = nf?.variants.some((v) => v.setSize === it.setSize);
                          updateItem(it.key, {
                            productFinishId: pfId,
                            setSize: keep ? it.setSize : (nf?.variants.find((v) => v.price !== null)?.setSize ?? 1),
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick a finish" />
                        </SelectTrigger>
                        <SelectContent>
                          {p?.finishes.map((x) => (
                            <SelectItem key={x.productFinishId} value={x.productFinishId}>
                              {x.name}
                              {!x.active ? " (off)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Default set size</Label>
                      <Select
                        value={String(it.setSize)}
                        onValueChange={(v) => updateItem(it.key, { setSize: Number(v) })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(f?.variants.length ? f.variants : [{ setSize: it.setSize, price: null, active: false }]).map(
                            (v) => (
                              <SelectItem key={v.setSize} value={String(v.setSize)}>
                                {setLabel(v.setSize)} · {v.price === null || !v.active ? "no price" : formatPrice(v.price)}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
            <div>
              <Button type="button" variant="outline" onClick={addPiece} disabled={items.length >= 4}>
                <Plus />
                Add a piece
              </Button>
              {items.length >= 4 && <span className="ml-3 text-xs text-muted-foreground">4 pieces is the most.</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>The combo&apos;s own photos. The first one is the cover on the combos page.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {images.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((img, n) => (
                  <li key={img.id} className="group relative overflow-hidden rounded-md border">
                    <div className="relative aspect-[4/5] bg-muted">
                      <Image src={img.key} alt={img.alt} fill sizes="200px" className="object-cover" />
                    </div>
                    {n === 0 && (
                      <span className="absolute top-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                        Cover
                      </span>
                    )}
                    <div className="flex justify-between gap-1 p-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Move left"
                        disabled={n === 0}
                        onClick={() => setImages((l) => move(l, n, n - 1))}
                      >
                        <ArrowLeft />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Remove photo"
                        onClick={() => setImages((l) => l.filter((x) => x.id !== img.id))}
                      >
                        <Trash2 />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Move right"
                        disabled={n === images.length - 1}
                        onClick={() => setImages((l) => move(l, n, n + 1))}
                      >
                        <ArrowRight />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No photos yet. Without one, the combos page shows the first piece&apos;s photo.
              </p>
            )}
            <div>
              <ImageUploader onUploaded={(img) => setImages((l) => [...l, img])} />
              <p className="mt-2 text-xs text-muted-foreground">
                Photo changes are kept when you save the combo. Removed photos are deleted from storage if nothing else
                uses them.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>Price</CardTitle>
            <CardDescription>
              Set the combo price for the default finishes, or a percentage off. When a shopper changes a finish, a
              price saving stays the same in rupees; a percentage is worked out again on the new total.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Pricing">
              {(
                [
                  ["price", "Combo price"],
                  ["percent", "Percent off"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    if (m === "price" && mode !== "price" && comboPrice === "") setComboPrice(String(live.total));
                    if (m === "percent" && mode !== "percent" && base.piecesTotal > 0 && discount)
                      setPercent(String(Math.round((live.saving / base.piecesTotal) * 100)));
                    setMode(m);
                  }}
                  className={`rounded px-2 py-1.5 text-sm ${mode === m ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === "price" ? (
              <div className="grid gap-2">
                <Label htmlFor="combo-price">Combo price (₹)</Label>
                <Input
                  id="combo-price"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={comboPrice}
                  onChange={(e) => setComboPrice(e.target.value)}
                  placeholder={String(base.piecesTotal)}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="combo-percent">Percent off</Label>
                <Input
                  id="combo-percent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
              </div>
            )}
            <p className="rounded-md bg-muted/60 p-3 text-sm leading-relaxed" aria-live="polite">
              Pieces total {formatPrice(live.piecesTotal)}. Combo price {formatPrice(live.total)}. Shopper saves{" "}
              <strong>{formatPrice(live.saving)}</strong>
              {mode === "percent" && discount ? ` (${discount.value}%)` : ""}.
            </p>
            {live.hidden.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="mb-1 font-medium">The shop hides this combo until this is fixed:</p>
                <ul className="list-disc pl-4">
                  {live.hidden.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : initial ? "Save changes" : "Create combo"}
            </Button>
            {initial && initial.status === "active" && (
              <Button asChild variant="outline">
                <Link href={`/combos/${initial.slug}`} target="_blank">
                  <ExternalLink />
                  View on the shop
                </Link>
              </Button>
            )}
            {initial && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="text-destructive" disabled={pending}>
                    <Trash2 />
                    Delete combo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {initial.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This can&apos;t be undone. If shoppers have it in their carts you&apos;ll be asked to archive it
                      instead.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={remove}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
