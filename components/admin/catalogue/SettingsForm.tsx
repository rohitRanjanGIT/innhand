"use client";

import { useState } from "react";
import { saveSettings } from "@/lib/admin/settings";
import { fieldErrorsOf, settingsSchema, type SettingsInput } from "@/lib/admin/schemas/catalogue";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Field, SavingIcon, firstErrors, useActionRunner } from "./shared";

type Values = SettingsInput;
type NumKey = "secondaryColourCount" | "effectCount" | "defaultCartLimit" | "shippingFee" | "freeShippingFrom";

export default function SettingsForm({ initial }: { initial: Values }) {
  const [values, setValues] = useState(initial);
  // Number inputs keep their raw text so a cleared box isn't turned into 0 while typing.
  const [raw, setRaw] = useState<Record<NumKey, string>>(() => ({
    secondaryColourCount: String(initial.secondaryColourCount),
    effectCount: String(initial.effectCount),
    defaultCartLimit: String(initial.defaultCartLimit),
    shippingFee: String(initial.shippingFee),
    freeShippingFrom: String(initial.freeShippingFrom),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));
  const num = (k: NumKey) => ({
    id: k,
    type: "number" as const,
    inputMode: "numeric" as const,
    value: raw[k],
    "aria-invalid": errors[k] ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setRaw((r) => ({ ...r, [k]: e.target.value }));
      set(k, e.target.value === "" ? Number.NaN : Number(e.target.value));
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setErrors({});
    run(() => saveSettings(parsed.data), {
      success: "Settings saved",
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Finish limits</CardTitle>
          <CardDescription>
            Every finish has one base colour. These cap how many secondary colours (SCC) and effects (SEC) a finish
            may have. They can&apos;t go below what an existing finish already uses.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Secondary colours per finish (SCC)" htmlFor="secondaryColourCount" error={errors.secondaryColourCount}>
            <Input {...num("secondaryColourCount")} min={0} max={6} />
          </Field>
          <Field label="Effects per finish (SEC)" htmlFor="effectCount" error={errors.effectCount}>
            <Input {...num("effectCount")} min={0} max={6} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cart and combos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Default cart limit"
            htmlFor="defaultCartLimit"
            error={errors.defaultCartLimit}
            hint="Most pieces of one product a cart can hold, when the product has no limit of its own."
          >
            <Input {...num("defaultCartLimit")} min={1} />
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-md border p-3 sm:col-span-2">
            <div>
              <label htmlFor="customCombosEnabled" className="text-sm font-medium">
                Shopper-built combos
              </label>
              <p className="text-xs text-muted-foreground">
                Lets shoppers build their own combo of 2 to 4 pieces for the tier discount. Turning it off removes the
                discount from bundles already in carts.
              </p>
            </div>
            <Switch
              id="customCombosEnabled"
              checked={values.customCombosEnabled}
              onCheckedChange={(v) => set("customCombosEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping</CardTitle>
          <CardDescription>Whole rupees.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Shipping fee (₹)" htmlFor="shippingFee" error={errors.shippingFee}>
            <Input {...num("shippingFee")} min={0} />
          </Field>
          <Field
            label="Free shipping from (₹)"
            htmlFor="freeShippingFrom"
            error={errors.freeShippingFrom}
            hint="Orders at or above this subtotal ship free."
          >
            <Input {...num("freeShippingFrom")} min={0} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>Shown on the site and used for &quot;Order on WhatsApp&quot;.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number" htmlFor="whatsappNumber" error={errors.whatsappNumber} hint="With country code, e.g. +91 98765 43210.">
            <Input
              id="whatsappNumber"
              type="tel"
              value={values.whatsappNumber}
              aria-invalid={errors.whatsappNumber ? true : undefined}
              onChange={(e) => set("whatsappNumber", e.target.value)}
            />
          </Field>
          <Field label="Contact email" htmlFor="contactEmail" error={errors.contactEmail}>
            <Input
              id="contactEmail"
              type="email"
              value={values.contactEmail}
              aria-invalid={errors.contactEmail ? true : undefined}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} />
          Save settings
        </Button>
      </div>
    </form>
  );
}
