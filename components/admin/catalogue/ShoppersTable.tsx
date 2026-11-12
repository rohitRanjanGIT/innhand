"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Loader2, Minus, Search } from "lucide-react";
import type { AdminShopper } from "@/lib/admin/queries/catalogue";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { EmptyState } from "./shared";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

type SortKey = "name" | "email" | "joined";
type Sort = { key: SortKey; dir: "asc" | "desc" };

export default function ShoppersTable({
  rows,
  total,
  q,
  limit,
}: {
  rows: AdminShopper[];
  total: number;
  q: string;
  limit: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<Sort>({ key: "joined", dir: "desc" });

  // Search on the server, a moment after typing stops.
  useEffect(() => {
    if (search.trim() === q) return;
    const t = setTimeout(() => {
      const params = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      startTransition(() => router.replace(`${pathname}${params}`));
    }, 300);
    return () => clearTimeout(t);
  }, [search, q, pathname, router]);

  const sorted = useMemo(() => {
    const val = (r: AdminShopper) => (sort.key === "joined" ? new Date(r.joined).getTime() : r[sort.key].toLowerCase());
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === "asc" ? c : -c;
    });
  }, [rows, sort]);

  function SortHeader({ k, label }: { k: SortKey; label: string }) {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        aria-label={`Sort by ${label}`}
        onClick={() => setSort({ key: k, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
      >
        {label} <Icon className="size-3" />
      </Button>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search shoppers"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">
          {total === rows.length ? `${total} shopper${total === 1 ? "" : "s"}` : `Showing ${rows.length} of ${total}`}
          {total > limit && " (newest first; search to narrow down)"}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={q ? "No shoppers match" : "No shoppers yet"}
          description={q ? `Nobody's name or email contains "${q}".` : "Shoppers appear here once they create an account."}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeader k="name" label="Name" />
                </TableHead>
                <TableHead>
                  <SortHeader k="email" label="Email" />
                </TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>
                  <SortHeader k="joined" label="Joined" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>
                    {r.verified ? <Badge variant="secondary">Verified</Badge> : <Badge variant="outline">Not verified</Badge>}
                  </TableCell>
                  <TableCell>
                    {r.hasPhone ? (
                      <Check className="size-4" aria-label="Has a phone number" />
                    ) : (
                      <Minus className="size-4 text-muted-foreground" aria-label="No phone number" />
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{dateFmt.format(new Date(r.joined))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
