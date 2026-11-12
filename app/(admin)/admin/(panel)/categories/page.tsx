import type { Metadata } from "next";
import { getCategoryTree } from "@/lib/admin/queries/catalogue";
import { PageHeader } from "@/components/admin/AdminShell";
import CategoriesManager from "@/components/admin/catalogue/CategoriesManager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const tree = await getCategoryTree();
  return (
    <>
      <PageHeader title="Categories" description="Head categories and their sub-categories. Drag to reorder within a level." />
      <CategoriesManager tree={tree} />
    </>
  );
}
