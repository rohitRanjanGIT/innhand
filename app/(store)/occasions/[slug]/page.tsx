import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ShopListing, { ListingFallback } from "@/components/shop/ShopListing";
import { getOccasion, getOccasions } from "@/lib/data/catalogue";

type Props = { params: Promise<{ slug: string }> };

// A tag's products ("Diwali Gifting", "Housewarming"…). Unknown slugs 404.
export async function generateStaticParams() {
  const occasions = await getOccasions();
  return occasions.length ? occasions.map((o) => ({ slug: o.slug })) : [{ slug: "all" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const occasion = await getOccasion((await params).slug);
  if (!occasion) return {};
  return {
    title: { absolute: `Innhand Creations — ${occasion.name}` },
    description: occasion.blurb || undefined,
  };
}

export default function OccasionPage({ params }: Props) {
  return (
    <Suspense fallback={<ListingFallback />}>
      <Occasion params={params} />
    </Suspense>
  );
}

async function Occasion({ params }: Props) {
  const occasion = await getOccasion((await params).slug);
  if (!occasion) notFound();
  return <ShopListing occasion={occasion} />;
}
