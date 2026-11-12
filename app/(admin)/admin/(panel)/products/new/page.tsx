import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/AdminShell";
import { NewProductForm } from "@/components/admin/products/NewProductForm";
import { getCategoryOptions } from "@/lib/admin/queries/products";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await getCategoryOptions();
  return (
    <>
      <PageHeader
        title="New product"
        description="Start with a name and sub-category. It's saved as a draft; add finishes, photos and prices next."
      />
      <NewProductForm categories={categories} />
    </>
  );
}
