"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ImageOff, Search, X } from "lucide-react";
import { Input } from "@/components/admin/ui/input";
import { Button } from "@/components/admin/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { CategorySelect } from "./CategorySelect";
import { StatusBadge } from "./fields";
import { imageUrl } from "@/lib/images";
import { priceLabel } from "@/lib/pricing";
import type { AdminProductRow, CategoryOption } from "@/lib/admin/queries/products";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/validation/product";

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { equalsString: filterFn_equalsString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
});

const helper = createColumnHelper<typeof features, AdminProductRow>();

/** Name or slug contains the search text (case-insensitive). */
const matchesSearch = (row: { original: AdminProductRow }, _columnId: string, value: unknown) => {
  const q = String(value ?? "").trim().toLowerCase();
  if (!q) return true;
  return row.original.name.toLowerCase().includes(q) || row.original.slug.toLowerCase().includes(q);
};

const columns = helper.columns([
  helper.display({
    id: "photo",
    header: "",
    cell: ({ row }) =>
      row.original.thumbKey ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(row.original.thumbKey, "thumb")}
          alt=""
          className="size-10 rounded-md border object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
          <ImageOff className="size-4" />
        </div>
      ),
  }),
  helper.accessor("name", {
    header: "Name",
    sortFn: "text",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium">{row.original.name}</div>
        <div className="truncate text-xs text-muted-foreground">/{row.original.slug}</div>
      </div>
    ),
  }),
  helper.accessor((r) => r.categoryId ?? "", {
    id: "category",
    header: "Category",
    filterFn: "equalsString",
    sortFn: (a, b) =>
      `${a.original.headCategoryName ?? ""}${a.original.categoryName ?? ""}`.localeCompare(
        `${b.original.headCategoryName ?? ""}${b.original.categoryName ?? ""}`,
      ),
    cell: ({ row }) =>
      row.original.categoryName ? (
        <span className="text-sm">
          <span className="text-muted-foreground">{row.original.headCategoryName} › </span>
          {row.original.categoryName}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">None</span>
      ),
  }),
  helper.accessor("status", {
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  helper.accessor((r) => r.price.price ?? Number.MAX_SAFE_INTEGER, {
    id: "price",
    header: "Price",
    sortFn: "basic",
    cell: ({ row }) => <span className="text-sm tabular-nums">{priceLabel(row.original.price)}</span>,
  }),
  helper.accessor("finishesCount", {
    header: "Finishes",
    sortFn: "basic",
    cell: ({ row }) => <span className="tabular-nums">{row.original.finishesCount}</span>,
  }),
  helper.accessor((r) => r.featuredRank ?? Number.MAX_SAFE_INTEGER, {
    id: "featured",
    header: "Featured",
    sortFn: "basic",
    cell: ({ row }) =>
      row.original.featuredRank == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="tabular-nums">#{row.original.featuredRank}</span>
      ),
  }),
]);

export function ProductsTable({
  rows,
  categories,
  initialStatus,
}: {
  rows: AdminProductRow[];
  categories: CategoryOption[];
  initialStatus: ProductStatus | null;
}) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialStatus ? [{ id: "status", value: initialStatus }] : [],
  );
  const data = useMemo(() => rows, [rows]);

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (r) => r.id,
    state: { globalFilter, sorting, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: matchesSearch,
    getColumnCanGlobalFilter: (c) => c.id === "name",
  });

  const status = (columnFilters.find((f) => f.id === "status")?.value as string | undefined) ?? "all";
  const category = (columnFilters.find((f) => f.id === "category")?.value as string | undefined) ?? null;

  function setFilter(id: string, value: string | null) {
    setColumnFilters((prev) => [...prev.filter((f) => f.id !== id), ...(value ? [{ id, value }] : [])]);
    if (id === "status") {
      // Keep ?status= in the address so the dashboard link and reloads agree.
      const url = new URL(window.location.href);
      if (value) url.searchParams.set("status", value);
      else url.searchParams.delete("status");
      window.history.replaceState(null, "", url);
    }
  }

  const shown = table.getRowModel().rows;
  const filtered = globalFilter !== "" || columnFilters.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search name or slug"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => setFilter("status", v === "all" ? null : v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PRODUCT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s[0].toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CategorySelect
          categories={categories}
          value={category}
          onChange={(v) => setFilter("category", v)}
          noneLabel="All categories"
          className="w-48"
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setGlobalFilter("");
              setFilter("status", null);
              setFilter("category", null);
            }}
          >
            <X /> Clear
          </Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {shown.length} of {rows.length}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort() && header.column.id !== "photo";
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className={header.column.id === "photo" ? "w-14" : undefined}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
                          {dir === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {rows.length === 0 ? "No products yet." : "No products match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => router.push(`/admin/products/${row.original.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(`/admin/products/${row.original.id}`);
                  }}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
