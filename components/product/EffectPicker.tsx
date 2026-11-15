"use client";

import { useId } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/pricing";
import type { ProductEffectOption } from "@/lib/data/types";
import own from "./EffectPicker.module.css";

/** The parent page's CSS module; it must define group, legend, choices, choice and pill. */
type Classes = { readonly [key: string]: string };

/**
 * The "Effect" group: None first, then each effect combination of the finish with its effects'
 * pictures and its price per piece. One choice at a time, like a colourway. `classes` comes from the
 * page's own module so it matches the other groups.
 */
export default function EffectPicker({
  options,
  value,
  onChange,
  perPiece = false,
  classes,
}: {
  options: ProductEffectOption[];
  value: string | null;
  onChange: (effectCombinationId: string | null) => void;
  /** Adds "each" to prices when the piece is sold in sets. */
  perPiece?: boolean;
  classes: Classes;
}) {
  const name = useId();
  const picked = options.find((o) => o.id === value) ?? null;
  return (
    <fieldset className={classes.group}>
      <legend className={classes.legend}>
        Effect — <strong>{picked?.name ?? "None"}</strong>
      </legend>
      <div className={classes.choices}>
        <label className={classes.choice}>
          <input type="radio" name={name} checked={!picked} onChange={() => onChange(null)} />
          <span className={classes.pill}>None</span>
        </label>
        {options.map((o) => (
          <label key={o.id} className={classes.choice} title={o.effects.map((e) => `${e.slot}: ${e.name}`).join(", ")}>
            <input type="radio" name={name} value={o.id} checked={picked?.id === o.id} onChange={() => onChange(o.id)} />
            <span className={`${classes.pill} ${own.pill}`}>
              {o.effects.some((e) => e.image) && (
                <span className={own.thumbs}>
                  {o.effects.map(
                    (e, i) =>
                      e.image && (
                        <Image key={i} src={e.image} alt="" width={24} height={24} sizes="24px" className={own.thumb} />
                      ),
                  )}
                </span>
              )}
              {o.name}
              {o.price > 0 && (
                <span className={own.price}>
                  +{formatPrice(o.price)}
                  {perPiece ? " each" : ""}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
