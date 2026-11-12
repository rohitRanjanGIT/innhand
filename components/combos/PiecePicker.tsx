"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice, unitPrice } from "@/lib/pricing";
import {
  choiceForFinish,
  defaultEffects,
  finishOf,
  needsNoneChoice,
  pieceImage,
  pricedLine,
  swatchBackground,
  type PieceChoice,
  type PieceProduct,
} from "./model";
import styles from "./Combos.module.css";

const setLabel = (n: number) => (n === 1 ? "Single" : `Set of ${n}`);

/** One piece of a combo: finish, colourway, effects and set size, with its own price. */
export default function PiecePicker({
  id,
  index,
  product,
  choice,
  onChange,
  action,
}: {
  /** Unique per piece on the page; keeps the radio groups apart. */
  id: string;
  index: number;
  product: PieceProduct;
  choice: PieceChoice;
  onChange: (c: PieceChoice) => void;
  action?: ReactNode;
}) {
  const finish = finishOf(product, choice);
  const img = pieceImage(product, choice);
  const line = pricedLine(product, choice);
  const price = line ? unitPrice(line) : null;
  const colourway = finish?.colourways.find((c) => c.id === choice.colourwayId);

  return (
    <article className={styles.piece} aria-labelledby={`${id}-name`}>
      <div className={styles.pieceMedia}>
        {img && (
          <Image
            src={img.key}
            alt={img.alt || `${product.name}, ${finish?.name ?? ""}`}
            fill
            sizes="(max-width: 560px) 200px, 140px"
            style={{ objectFit: "cover" }}
          />
        )}
      </div>

      <div className={styles.pieceBody}>
        <div className={styles.pieceHead}>
          <div>
            <span className={styles.pieceEyebrow}>
              Piece {index + 1}
              {product.category ? ` · ${product.category}` : ""}
            </span>
            <h3 id={`${id}-name`} className={styles.pieceName}>
              <Link href={`/products/${product.slug}`}>{product.name}</Link>
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className={styles.piecePrice}>{price === null ? "" : formatPrice(price)}</span>
            {action}
          </div>
        </div>

        {product.finishes.length > 1 && (
          <fieldset className={styles.group}>
            <legend className={styles.legend}>
              Finish — <strong>{finish?.name}</strong>
            </legend>
            <div className={styles.choices}>
              {product.finishes.map((f) => (
                <label key={f.productFinishId} className={styles.choice}>
                  <input
                    type="radio"
                    name={`${id}-finish`}
                    checked={f.productFinishId === choice.productFinishId}
                    onChange={() => onChange(choiceForFinish(f, choice.setSize))}
                  />
                  <span className={styles.pill}>{f.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {product.finishes.length === 1 && finish && (
          <p className={styles.legend} style={{ margin: 0 }}>
            Finish — <strong>{finish.name}</strong>
          </p>
        )}

        {finish && finish.colourways.length > 0 && (
          <fieldset className={styles.group}>
            <legend className={styles.legend}>
              Colourway — <strong>{colourway?.name}</strong>
            </legend>
            <div className={styles.choices}>
              {finish.colourways.map((c) => (
                <label
                  key={c.id}
                  className={styles.choice}
                  title={`${c.name}: ${c.swatches.map((s) => `${s.slotLabel} ${s.colourName}`).join(", ")}`}
                >
                  <input
                    type="radio"
                    name={`${id}-colourway`}
                    aria-label={c.name}
                    checked={c.id === choice.colourwayId}
                    onChange={() => onChange({ ...choice, colourwayId: c.id })}
                  />
                  <span className={styles.swatch} style={{ background: swatchBackground(c.swatches) }} />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {finish?.effectSlots.map((slot) => {
          const current = choice.effects[slot.id] ?? null;
          const currentName = slot.options.find((o) => o.id === current)?.name ?? "None";
          const pick = (optionId: string | null) =>
            onChange({ ...choice, effects: { ...defaultEffects(finish), ...choice.effects, [slot.id]: optionId } });
          return (
            <fieldset key={slot.id} className={styles.group}>
              <legend className={styles.legend}>
                {slot.label} — <strong>{currentName}</strong>
              </legend>
              <div className={styles.choices}>
                {needsNoneChoice(slot) && (
                  <label className={styles.choice}>
                    <input type="radio" name={`${id}-fx-${slot.id}`} checked={current === null} onChange={() => pick(null)} />
                    <span className={styles.pill}>None</span>
                  </label>
                )}
                {slot.options.map((o) => (
                  <label key={o.id} className={styles.choice}>
                    <input
                      type="radio"
                      name={`${id}-fx-${slot.id}`}
                      checked={current === o.id}
                      onChange={() => pick(o.id)}
                    />
                    <span className={styles.pill}>
                      {o.name}
                      {o.extraPrice > 0 && <small>+{formatPrice(o.extraPrice)}</small>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}

        {finish && finish.variants.length > 1 && (
          <fieldset className={styles.group}>
            <legend className={styles.legend}>
              Set size — <strong>{setLabel(choice.setSize)}</strong>
            </legend>
            <div className={styles.choices}>
              {finish.variants.map((v) => (
                <label key={v.id} className={styles.choice}>
                  <input
                    type="radio"
                    name={`${id}-set`}
                    checked={v.setSize === choice.setSize}
                    onChange={() => onChange({ ...choice, setSize: v.setSize })}
                  />
                  <span className={styles.pill}>{setLabel(v.setSize)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </article>
  );
}
