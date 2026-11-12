import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/AdminShell";
import ComboEditor from "@/components/admin/combos/ComboEditor";
import { getComboProductsAdmin } from "@/lib/admin/queries/combos";

export const metadata: Metadata = { title: "New combo" };

export default async function NewComboPage() {
  const products = await getComboProductsAdmin();
  return (
    <>
      <PageHeader title="New combo" description="Pick 2 to 4 pieces, add photos and set the price." />
      <ComboEditor products={products} />
    </>
  );
}
