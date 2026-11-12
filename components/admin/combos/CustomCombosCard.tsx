"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Switch } from "@/components/admin/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { saveComboTiers, setCustomCombosEnabled } from "@/lib/admin/combos";
import { discountAmount, formatPrice } from "@/lib/pricing";

type Tier = { itemCount: number; discountType: "amount" | "percent"; discountValue: number };

/** The shopper-built combo switch and the 2, 3 and 4 piece discounts. */
export default function CustomCombosCard({ enabled: initialEnabled, tiers: initialTiers }: { enabled: boolean; tiers: Tier[] }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [tiers, setTiers] = useState(initialTiers.map((t) => ({ ...t, text: String(t.discountValue) })));
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const res = await setCustomCombosEnabled({ enabled: next });
      if (!res.ok) {
        setEnabled(!next);
        toast.error(res.error);
        return;
      }
      toast.success(next ? "Shoppers can build their own combos" : "Shopper-built combos are off");
      router.refresh();
    });
  }

  function saveTiers() {
    startTransition(async () => {
      const res = await saveComboTiers({
        tiers: tiers.map((t) => ({
          itemCount: t.itemCount as 2 | 3 | 4,
          discountType: t.discountType,
          discountValue: Math.round(Number(t.text) || 0),
        })),
      });
      if (!res.ok) {
        toast.error(res.fieldErrors ? Object.values(res.fieldErrors)[0]?.[0] ?? res.error : res.error);
        return;
      }
      toast.success("Discounts saved");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shopper-built combos</CardTitle>
        <CardDescription>
          Shoppers pick 2 to 4 pieces at /combos/build and get the discount for that many pieces. Products can opt out
          with their &ldquo;Can be used in shopper-built combos&rdquo; switch.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Switch id="custom-combos" checked={enabled} onCheckedChange={toggle} disabled={pending} />
          <Label htmlFor="custom-combos">{enabled ? "On: shoppers can build their own" : "Off: the build page is hidden"}</Label>
        </div>
        {!enabled && (
          <p className="text-xs text-muted-foreground">
            Bundles already in carts lose their discount while this is off, and the cart says so.
          </p>
        )}
        <div className="grid gap-3">
          {tiers.map((t, n) => {
            const example = discountAmount(1000, { type: t.discountType, value: Math.round(Number(t.text) || 0) });
            return (
              <div key={t.itemCount} className="grid grid-cols-[90px_minmax(0,1fr)_120px] items-center gap-3">
                <Label htmlFor={`tier-${t.itemCount}`}>{t.itemCount} pieces</Label>
                <Input
                  id={`tier-${t.itemCount}`}
                  type="number"
                  min={0}
                  max={t.discountType === "percent" ? 100 : undefined}
                  step={1}
                  value={t.text}
                  onChange={(e) => setTiers((l) => l.map((x, i) => (i === n ? { ...x, text: e.target.value } : x)))}
                />
                <Select
                  value={t.discountType}
                  onValueChange={(v) =>
                    setTiers((l) => l.map((x, i) => (i === n ? { ...x, discountType: v as Tier["discountType"] } : x)))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">% off</SelectItem>
                    <SelectItem value="amount">₹ off</SelectItem>
                  </SelectContent>
                </Select>
                <p className="col-span-3 -mt-1 text-xs text-muted-foreground">
                  On pieces worth {formatPrice(1000)} the shopper saves {formatPrice(example)}.
                </p>
              </div>
            );
          })}
        </div>
        <div>
          <Button type="button" onClick={saveTiers} disabled={pending}>
            {pending ? "Saving…" : "Save discounts"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
