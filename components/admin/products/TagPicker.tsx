"use client";
import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/admin/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";
import type { TagOption } from "@/lib/admin/queries/products";
import { cn } from "@/lib/utils";

/** Multi-select for occasions (also used for search and similar products). */
export function TagPicker({
  tags,
  value,
  onChange,
  id,
}: {
  tags: TagOption[];
  value: string[];
  onChange: (v: string[]) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const byId = new Map(tags.map((t) => [t.id, t]));
  const toggle = (tagId: string) =>
    onChange(value.includes(tagId) ? value.filter((v) => v !== tagId) : [...value, tagId]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className="text-muted-foreground">{value.length ? `${value.length} selected` : "Add occasions"}</span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search occasions" />
            <CommandList>
              <CommandEmpty>No occasions found. Add them under Occasions.</CommandEmpty>
              <CommandGroup>
                {tags.map((t) => (
                  <CommandItem key={t.id} value={t.name} onSelect={() => toggle(t.id)}>
                    <Check className={cn("size-4", value.includes(t.id) ? "opacity-100" : "opacity-0")} />
                    {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tagId) => (
            <Badge key={tagId} variant="secondary" className="gap-1 pr-1">
              {byId.get(tagId)?.name ?? "Unknown occasion"}
              <button
                type="button"
                onClick={() => toggle(tagId)}
                className="rounded-full p-0.5 hover:bg-background"
                aria-label={`Remove ${byId.get(tagId)?.name ?? "occasion"}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
