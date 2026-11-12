import type { Metadata } from "next";
import { listTagProductIds, listTags } from "@/lib/admin/queries/catalogue";
import { listProductOptions } from "@/lib/admin/queries/products";
import { PageHeader } from "@/components/admin/AdminShell";
import OccasionsManager from "@/components/admin/catalogue/OccasionsManager";

export const metadata: Metadata = { title: "Occasions" };

export default async function OccasionsPage() {
  const [occasions, productOptions, productIds] = await Promise.all([
    listTags(),
    listProductOptions(),
    listTagProductIds(),
  ]);
  return (
    <>
      <PageHeader
        title="Occasions"
        description="Occasions products are grouped by, like Diwali or Housewarming. Drag to reorder, and add products to an occasion here."
      />
      <OccasionsManager occasions={occasions} products={productOptions} productIds={productIds} />
    </>
  );
}
