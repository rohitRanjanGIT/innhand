"use client";
// Small inputs shared by the product screens.
import { useEffect, useState } from "react";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/lib/validation/product";

/** A whole-number input whose empty state means null (e.g. "price on request", "store default"). */
export function NumberField({
  value,
  onChange,
  className,
  prefix,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "prefix"> & {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  prefix?: string;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  // Follow outside changes (reset, "copy to all") without fighting the user's typing.
  useEffect(() => {
    const parsed = text === "" ? null : Number(text);
    if (parsed !== (value ?? null)) setText(value == null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const input = (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      className={cn(prefix && "pl-6", className)}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "").slice(0, 8);
        setText(t);
        onChange(t === "" ? null : Number(t));
      }}
    />
  );
  if (!prefix) return input;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        {prefix}
      </span>
      {input}
    </div>
  );
}

const STATUS_STYLE: Record<ProductStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge variant="secondary" className={cn("capitalize", STATUS_STYLE[status])}>
      {status}
    </Badge>
  );
}

/** Red text for a field error, if any. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
