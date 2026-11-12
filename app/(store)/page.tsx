import type { Metadata } from "next";
import HeroFan from "@/components/home/HeroFan";
import MadeByHand from "@/components/home/MadeByHand";
import Categories from "@/components/home/Categories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import StoryTeaser from "@/components/home/StoryTeaser";
import WhyJesmonite from "@/components/home/WhyJesmonite";
import Reviews from "@/components/home/Reviews";
import CustomOrders from "@/components/home/CustomOrders";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Home" },
};

export default function HomePage() {
  return (
    <main>
      <HeroFan />
      <MadeByHand />
      <Categories />
      <FeaturedProducts />
      <StoryTeaser />
      <WhyJesmonite />
      <Reviews />
      <CustomOrders />
    </main>
  );
}
