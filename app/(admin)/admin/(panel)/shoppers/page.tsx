import type { Metadata } from "next";
import { listShoppers } from "@/lib/admin/queries/catalogue";
import { PageHeader } from "@/components/admin/AdminShell";
import ShoppersTable from "@/components/admin/catalogue/ShoppersTable";

export const metadata: Metadata = { title: "Shoppers" };

const LIMIT = 500;

export default async function ShoppersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  const { rows, total } = await listShoppers(q, LIMIT);
  return (
    <>
      <PageHeader title="Shoppers" description="Everyone with a shopper account. Read only." />
      <ShoppersTable rows={rows} total={total} q={q} limit={LIMIT} />
    </>
  );
}
