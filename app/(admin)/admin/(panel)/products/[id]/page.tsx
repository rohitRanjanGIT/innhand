import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/products/ProductEditor";
import { getProductEditor, getProductFormOptions } from "@/lib/admin/queries/products";

export const metadata: Metadata = { title: "Edit product" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [data, options] = await Promise.all([getProductEditor(id), getProductFormOptions(id)]);
  if (!data) notFound();
  return <ProductEditor data={data} options={options} />;
}
