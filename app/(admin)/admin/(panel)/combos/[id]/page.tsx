import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/AdminShell";
import ComboEditor from "@/components/admin/combos/ComboEditor";
import { getComboAdmin, getComboProductsAdmin } from "@/lib/admin/queries/combos";

export const metadata: Metadata = { title: "Edit combo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const combo = await getComboAdmin(id);
  if (!combo) notFound();
  // Products already in the combo stay pickable even if they are no longer active.
  const products = await getComboProductsAdmin(combo.items.map((i) => i.productId));
  return (
    <>
      <PageHeader title={combo.name} description={`/combos/${combo.slug}`} />
      <ComboEditor key={combo.id} products={products} initial={combo} />
    </>
  );
}
