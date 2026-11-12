"use client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";
import type { CategoryOption } from "@/lib/admin/queries/products";

const NONE = "__none";

/** Sub-category picker grouped by head category. Head categories can't be picked. */
export function CategorySelect({
  categories,
  value,
  onChange,
  allowNone = true,
  noneLabel = "No category",
  id,
  className,
  invalid,
}: {
  categories: CategoryOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  id?: string;
  className?: string;
  invalid?: boolean;
}) {
  const heads = categories.filter((h) => h.children.length > 0);
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger id={id} className={className ?? "w-full"} aria-invalid={invalid || undefined}>
        <SelectValue placeholder="Pick a sub-category" />
      </SelectTrigger>
      <SelectContent position="popper">
        {allowNone && (
          <>
            <SelectItem value={NONE}>{noneLabel}</SelectItem>
            <SelectSeparator />
          </>
        )}
        {heads.map((h) => (
          <SelectGroup key={h.id}>
            <SelectLabel>{h.name}</SelectLabel>
            {h.children.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {!c.active && <span className="text-xs text-muted-foreground"> (hidden)</span>}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
