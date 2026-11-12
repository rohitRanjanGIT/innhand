import { Skeleton } from "@/components/admin/ui/skeleton";

/**
 * Shown instantly inside the admin shell while the next page's data loads, so a click never
 * feels dead. The sidebar and header stay put because the shell lives in the layout.
 */
export default function PanelLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="admin-progress" aria-hidden />
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-9 w-full max-w-xs" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
