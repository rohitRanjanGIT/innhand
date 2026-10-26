import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopListing from "@/components/shop/ShopListing";
import { categories, getCategory } from "@/lib/products";

type Props = { params: Promise<{ category: string }> };

// Only the shop's categories have pages; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getCategory((await params).category);
  if (!category) return {};
  return {
    title: { absolute: `Innhand Creations — ${category.name}` },
    description: category.blurb,
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  return <ShopListing category={category} />;
}
