"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBundleToCart } from "@/lib/cart/actions";

type BundleInput = Parameters<typeof addBundleToCart>[0];

/** Adds a bundle to the cart and keeps a short status message for the button below it. */
export function useAddBundle() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function add(input: BundleInput) {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await addBundleToCart(input);
        if (res.ok) {
          setStatus({ ok: true, text: "Added to cart ✓" });
          router.refresh(); // header count
        } else {
          setStatus({ ok: false, text: res.error });
        }
      } catch {
        setStatus({ ok: false, text: "Something went wrong. Please try again." });
      }
    });
  }

  return { add, pending, status };
}
