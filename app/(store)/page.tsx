import type { Metadata } from "next";
import HeroFan from "@/components/home/HeroFan";
import MadeByHand from "@/components/home/MadeByHand";
import Categories from "@/components/home/Categories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import StoryTeaser from "@/components/home/StoryTeaser";
import WhyJesmonite from "@/components/home/WhyJesmonite";
import Reviews from "@/components/home/Reviews";
import CustomOrders from "@/components/home/CustomOrders";
import { getFeaturedProducts, getProductTiles } from "@/lib/data/catalogue";
import { getHomeContent } from "@/lib/data/home";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Home" },
};

export default async function HomePage() {
  // The hero shows every featured piece (or the first few pieces when none are featured).
  const [featured, home] = await Promise.all([getFeaturedProducts(), getHomeContent()]);
  const hero = (featured.length ? featured : (await getProductTiles()).slice(0, 8)).map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    image: p.image,
    href: p.href,
  }));
  return (
    <main>
      {hero.length > 0 && <HeroFan products={hero} />}
      <MadeByHand section={home.process} />
      <Categories />
      <FeaturedProducts />
      <StoryTeaser section={home.story} />
      <WhyJesmonite />
      <Reviews section={home.reviews} />
      <CustomOrders />
    </main>
  );
}
