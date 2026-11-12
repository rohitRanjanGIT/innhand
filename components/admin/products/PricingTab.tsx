"use client";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Copy, Plus, X } from "lucide-react";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/admin/ui/tooltip";
import { FieldError, NumberField } from "./fields";
import type { ProductFormOptions } from "@/lib/admin/queries/products";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { margin, priceKey, type ProductInput } from "@/lib/validation/product";

type Cell = { price: number | null; costPrice: number | null };
const EMPTY: Cell = { price: null, costPrice: null };

export function PricingTab({ options }: { options: ProductFormOptions }) {
  const { control, setValue, getValues, formState } = useFormContext<ProductInput>();
  const finishes = useWatch({ control, name: "finishes" });
  const soldInSets = useWatch({ control, name: "soldInSets" });
  const setSizes = useWatch({ control, name: "setSizes" });
  const prices = useWatch({ control, name: "prices" });
  const [newSize, setNewSize] = useState<number | null>(null);
  const names = new Map(options.finishes.map((f) => [f.id, f.name]));

  const sizes = [...setSizes].sort((a, b) => a - b);
  const rows = finishes.flatMap((f) => sizes.map((size) => ({ finishId: f.finishId, size, key: priceKey(f.finishId, size) })));

  const opts = { shouldDirty: true, shouldValidate: formState.isSubmitted };
  const writePrices = (next: Record<string, Cell>) => setValue("prices", next, opts);
  const setCell = (key: string, patch: Partial<Cell>) => {
    const cur = getValues("prices");
    writePrices({ ...cur, [key]: { ...(cur[key] ?? EMPTY), ...patch } });
  };
  function copyToAll(field: keyof Cell, from: { key: string; size: number } | null, sameSizeOnly: boolean) {
    if (!from) return;
    const cur = getValues("prices");
    const value = (cur[from.key] ?? EMPTY)[field];
    const next = { ...cur };
    for (const r of rows) if (!sameSizeOnly || r.size === from.size) next[r.key] = { ...(next[r.key] ?? EMPTY), [field]: value };
    writePrices(next);
  }

  function addSize(size: number | null) {
    if (size === null || size < 2 || size > 100 || setSizes.includes(size)) return;
    setValue("setSizes", [...setSizes, size].sort((a, b) => a - b), opts);
    setNewSize(null);
  }
  const removeSize = (size: number) =>
    setValue(
      "setSizes",
      setSizes.filter((s) => s !== size),
      opts,
    );
  const suggestions = [2, 3, 4, 5, 6].filter((s) => !setSizes.includes(s));
  const first = rows[0] ?? null;

  return (
    <div className="space-y-6">
      {soldInSets && (
        <Card>
          <CardHeader>
            <CardTitle>Set sizes</CardTitle>
            <CardDescription>
              These apply to every finish. Removing one that's in a shopper's cart hides it instead of deleting it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {sizes.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 py-1 pr-1 pl-2.5 text-sm">
                  Set of {s}
                  <button
                    type="button"
                    disabled={sizes.length === 1}
                    onClick={() => removeSize(s)}
                    className="rounded-full p-0.5 hover:bg-background disabled:opacity-30"
                    aria-label={`Remove set of ${s}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NumberField
                className="w-28"
                placeholder="Set size"
                value={newSize}
                onChange={setNewSize}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSize(newSize);
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addSize(newSize)} disabled={!newSize || newSize < 2}>
                <Plus /> Add
              </Button>
              {suggestions.map((s) => (
                <Button key={s} type="button" variant="ghost" size="sm" onClick={() => addSize(s)}>
                  + {s}
                </Button>
              ))}
            </div>
            <FieldError message={formState.errors.setSizes?.message ?? formState.errors.setSizes?.root?.message} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Prices</CardTitle>
            <CardDescription>
              Whole rupees. An empty price shows “Ask for a quote”. Cost price is only ever seen here.
            </CardDescription>
          </div>
          {rows.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copyToAll("price", first, false)}>
                <Copy /> Copy first price to all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copyToAll("costPrice", first, false)}>
                <Copy /> Copy first cost to all
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tick at least one finish on the Finishes tab to set prices.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finish</TableHead>
                    {soldInSets && <TableHead>Set</TableHead>}
                    <TableHead className="w-36">Price</TableHead>
                    <TableHead className="w-36">Cost price</TableHead>
                    <TableHead>Margin</TableHead>
                    {soldInSets && finishes.length > 1 && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const cell = prices[r.key] ?? EMPTY;
                    const m = margin(cell.price, cell.costPrice);
                    const firstOfFinish = i === 0 || rows[i - 1].finishId !== r.finishId;
                    return (
                      <TableRow key={r.key} className={cn(firstOfFinish && i > 0 && "border-t-2")}>
                        <TableCell className="font-medium">{firstOfFinish ? (names.get(r.finishId) ?? "Finish") : ""}</TableCell>
                        {soldInSets && <TableCell className="text-muted-foreground">Set of {r.size}</TableCell>}
                        <TableCell>
                          <NumberField
                            prefix="₹"
                            placeholder="On request"
                            aria-label={`Price, ${names.get(r.finishId)}${soldInSets ? `, set of ${r.size}` : ""}`}
                            value={cell.price}
                            onChange={(v) => setCell(r.key, { price: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <NumberField
                            prefix="₹"
                            placeholder="—"
                            aria-label={`Cost price, ${names.get(r.finishId)}${soldInSets ? `, set of ${r.size}` : ""}`}
                            value={cell.costPrice}
                            onChange={(v) => setCell(r.key, { costPrice: v })}
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {m ? (
                            <span className={cn(m.amount < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}>
                              {formatPrice(m.amount)}
                              {m.percent !== null && <span className="text-muted-foreground"> · {m.percent}%</span>}
                              {m.amount < 0 && <span className="ml-1 text-xs">below cost</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {soldInSets && finishes.length > 1 && (
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Copy to every finish's set of ${r.size}`}
                                  onClick={() => {
                                    copyToAll("price", r, true);
                                    copyToAll("costPrice", r, true);
                                  }}
                                >
                                  <Copy />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy price and cost to every finish&apos;s set of {r.size}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
