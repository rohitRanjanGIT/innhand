import type { Metadata } from "next";
import ShopListing from "@/components/shop/ShopListing";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Shop" },
  description: "Hand-poured Jesmonite pieces for the home and for gifting, made to order in your colours.",
};

export default function ShopPage() {
  return <ShopListing />;
}
