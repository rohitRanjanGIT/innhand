import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { getFinishEditor } from "@/lib/admin/queries/finishes";
import { PageHeader } from "@/components/admin/AdminShell";
import FinishEditor from "@/components/admin/catalogue/FinishEditor";
import { Badge } from "@/components/admin/ui/badge";

export const metadata: Metadata = { title: "Edit finish" };

export default async function FinishEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getFinishEditor(id);
  if (!data) notFound();

  return (
    <>
      <Link
        href="/admin/finishes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Finishes
      </Link>
      <PageHeader
        title={data.finish.name}
        description={`Used by ${data.productCount} product${data.productCount === 1 ? "" : "s"}.`}
        actions={!data.finish.active ? <Badge variant="secondary">Archived</Badge> : undefined}
      />
      <FinishEditor data={data} />
    </>
  );
}
