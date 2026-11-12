"use client";

import { createContext, use, useState, type ReactNode } from "react";
import type { ProductDetail } from "@/lib/data/types";
import { initialChoice, type Choice } from "./choice";

type Ctx = { product: ProductDetail; choice: Choice; setChoice: (c: Choice) => void };

const ChoiceContext = createContext<Ctx | null>(null);

/** Holds the shopper's choice so the gallery, the price and the options all follow it. */
export function ProductChoiceProvider({ product, children }: { product: ProductDetail; children: ReactNode }) {
  const [choice, setChoice] = useState(() => initialChoice(product));
  return <ChoiceContext value={{ product, choice, setChoice }}>{children}</ChoiceContext>;
}

export function useProductChoice() {
  const ctx = use(ChoiceContext);
  if (!ctx) throw new Error("useProductChoice must be used inside ProductChoiceProvider");
  return ctx;
}
