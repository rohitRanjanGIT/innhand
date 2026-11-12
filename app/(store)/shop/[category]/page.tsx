import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ShopListing, { ListingFallback } from "@/components/shop/ShopListing";
import { getCategories, getCategory } from "@/lib/data/catalogue";

type Props = { params: Promise<{ category: string }> };

// Every category is prerendered; one added later renders on its first visit. Unknown slugs 404.
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.length ? categories.map((c) => ({ category: c.slug })) : [{ category: "all" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).category);
  if (!category) return {};
  return {
    title: { absolute: `Innhand Creations — ${category.name}` },
    description: category.blurb || undefined,
  };
}

export default function CategoryPage({ params }: Props) {
  return (
    <Suspense fallback={<ListingFallback />}>
      <Category params={params} />
    </Suspense>
  );
}

async function Category({ params }: Props) {
  const category = await getCategory((await params).category);
  if (!category) notFound();
  return <ShopListing category={category} />;
}
