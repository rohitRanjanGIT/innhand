"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, ImageOff, Loader2, Trash2, X } from "lucide-react";
import type { ActionResult } from "@/lib/admin/action";
import { imageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import ImageUploader from "@/components/admin/ImageUploader";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
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

/**
 * Runs a Server Action inside a transition and toasts the outcome. Returns `[pending, run]`.
 * `run` resolves to the result so callers can read fieldErrors.
 */
export function useActionRunner() {
  const [pending, startTransition] = useTransition();
  function run<T>(
    call: () => Promise<ActionResult<T>>,
    opts: { success?: string; onSuccess?: (data: T) => void; onError?: (r: Extract<ActionResult<T>, { ok: false }>) => void } = {},
  ) {
    return new Promise<ActionResult<T> | null>((resolve) => {
      startTransition(async () => {
        try {
          const r = await call();
          if (r.ok) {
            if (opts.success) toast.success(opts.success);
            opts.onSuccess?.(r.data);
          } else {
            toast.error(r.error);
            opts.onError?.(r);
          }
          resolve(r);
        } catch (e) {
          toast.error(e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");
          resolve(null);
        }
      });
    });
  }
  return [pending, run] as const;
}

/** Which cards are folded shut. Everything starts open. */
export function useCollapsed() {
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  return {
    isOpen: (id: string) => !closed.has(id),
    toggle: (id: string) =>
      setClosed((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    /** Opens or closes every card in `ids`. */
    setAll: (ids: string[], open: boolean) => setClosed(open ? new Set() : new Set(ids)),
    anyOpen: (ids: string[]) => ids.some((id) => !closed.has(id)),
  };
}

/** The chevron that folds a card's nested list. */
export function CollapseToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded={open}
      aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
      title={open ? "Collapse" : "Expand"}
      onClick={onToggle}
    >
      <ChevronDown className={cn("transition-transform", !open && "-rotate-90")} />
    </Button>
  );
}

/** Flattens server fieldErrors to the first message per field. */
export function firstErrors(fieldErrors?: Record<string, string[]>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fieldErrors ?? {})) if (v[0]) out[k] = v[0];
  return out;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

/** Label + control + error, stacked. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

export function SavingIcon({ pending }: { pending: boolean }) {
  return pending ? <Loader2 className="animate-spin" /> : null;
}

/** A button that asks before doing something destructive. */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  children,
  variant = "ghost",
  size = "icon-sm",
  disabled,
  label,
}: {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  children?: ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  /** Accessible name when the trigger is an icon. */
  label?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size} disabled={disabled} aria-label={label ?? confirmLabel}>
          {children ?? <Trash2 />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Swatch({ hex, className, title }: { hex: string; className?: string; title?: string }) {
  return (
    <span
      title={title ?? hex}
      className={cn("inline-block size-6 shrink-0 rounded-full border border-black/10", className)}
      style={{ backgroundColor: hex }}
    />
  );
}

/** Hex text field with a native colour picker and a swatch. */
export function ColourInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (hex: string) => void;
  invalid?: boolean;
}) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Pick a colour"
        value={valid ? value.toLowerCase() : "#000000"}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-9 w-11 shrink-0 cursor-pointer rounded-md border bg-background p-1"
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#E1DAD3"
        maxLength={7}
        aria-invalid={invalid || !valid || undefined}
        className="w-32 font-mono uppercase"
      />
    </div>
  );
}

export type ImageValue = { id: string; url: string } | null;

/**
 * One optional image: shows the current one, uploads a replacement through R2, or clears it. When
 * R2 isn't set up yet the uploader's error toast explains it and the current image stays.
 */
export function ImageField({ value, onChange }: { value: ImageValue; onChange: (v: ImageValue) => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {value && !broken ? (
          <img src={value.url} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <ImageOff className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <ImageUploader
          multiple={false}
          label={value ? "Replace image" : "Upload image"}
          onUploaded={(img) => {
            setBroken(false);
            onChange({ id: img.id, url: imageUrl(img.key, "thumb") });
          }}
        />
        {value && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            <X /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
