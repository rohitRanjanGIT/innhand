"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { FieldError } from "./shared";

/** `key` is a stable React key; `id` is the saved slot's id (absent when new). */
export type EffectSlotState = { key: string; id?: string; label: string };

/**
 * Effect slots work like colour slots: up to SEC named slots ("Flakes", "Rim"). Effect combinations
 * (below the form, like colourways) then pick one library effect for each slot.
 */
export default function EffectSlotsCard({
  slots,
  onChange,
  sec,
  errors,
  newKey,
}: {
  slots: EffectSlotState[];
  onChange: (slots: EffectSlotState[]) => void;
  sec: number;
  errors: Record<string, string>;
  newKey: () => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Effect slots</CardTitle>
        <CardDescription>
          Up to {sec} effect slot{sec === 1 ? "" : "s"} (
          <Link href="/admin/settings" className="underline underline-offset-4">
            SEC
          </Link>
          ). Name each one; effect combinations then pick one effect per slot. Removing a slot removes its effect from
          every combination of this finish.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {slots.length === 0 && <p className="text-sm text-muted-foreground">No effect slots on this finish.</p>}
        {slots.map((slot, i) => (
          <div key={slot.key} className="grid gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="w-24 justify-center">
                Effect {i + 1}
              </Badge>
              <Input
                aria-label={`Effect slot ${i + 1} name`}
                value={slot.label}
                placeholder="e.g. Flakes"
                onChange={(e) => onChange(slots.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
                className="max-w-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${slot.label || "slot"}`}
                onClick={() => onChange(slots.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            <FieldError message={errors[`effectSlots.${i}.label`]} />
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={slots.length >= sec}
            onClick={() => onChange([...slots, { key: newKey(), label: "" }])}
          >
            <Plus /> Add effect slot
          </Button>
          {slots.length >= sec && <span className="ml-3 text-xs text-muted-foreground">Limit of {sec} reached.</span>}
        </div>
      </CardContent>
    </Card>
  );
}
