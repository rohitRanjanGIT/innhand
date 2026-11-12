"use client";
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
import { Button } from "@/components/admin/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/admin/ui/tooltip";

/** A button that asks before doing something destructive. */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
  disabled,
  tooltip,
  variant = "outline",
  size = "sm",
  className,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Shown on hover, e.g. why the button is disabled. */
  tooltip?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  children: React.ReactNode;
}) {
  const trigger = (
    <AlertDialogTrigger asChild>
      <Button type="button" variant={variant} size={size} disabled={disabled} className={className}>
        {children}
      </Button>
    </AlertDialogTrigger>
  );
  return (
    <AlertDialog>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* A span so the tooltip still shows while the button is disabled. */}
            <span tabIndex={disabled ? 0 : -1}>{trigger}</span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
