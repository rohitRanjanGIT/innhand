import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/admin/ui/button";
import { ProductsTable } from "@/components/admin/products/ProductsTable";
import { getCategoryOptions, listAdminProducts } from "@/lib/admin/queries/products";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/validation/product";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const [{ status }, rows, categories] = await Promise.all([searchParams, listAdminProducts(), getCategoryOptions()]);
  const s = Array.isArray(status) ? status[0] : status;
  const initialStatus = (PRODUCT_STATUSES as readonly string[]).includes(s ?? "") ? (s as ProductStatus) : null;
  return (
    <>
      <PageHeader
        title="Products"
        description="Click a product to edit its details, finishes, photos, prices and similar products."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus /> New product
            </Link>
          </Button>
        }
      />
      <ProductsTable rows={rows} categories={categories} initialStatus={initialStatus} />
    </>
  );
}
