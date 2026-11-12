"use client";

import Image from "next/image";
import { useState } from "react";
import { PhotoTag } from "../ui";
import { imagesFor, resolveChoice } from "./choice";
import { useProductChoice } from "./ProductChoice";
import styles from "./Product.module.css";

// Tints for the extra shots until there are real photos of each piece.
const placeholders = ["#EBCFC8", "#DCDFD1", "#D3DAE0"];

/** Follows the chosen finish and colourway (photos linked to the colourway come first). */
export default function ProductGallery() {
  const { product, choice } = useProductChoice();
  const { finish } = resolveChoice(product, choice);
  const images = imagesFor(product, finish, choice.colourwayId);
  // A new set of photos starts from its first one.
  return <Shots key={images.map((i) => i.key).join("|")} images={images} name={product.name} />;
}

function Shots({ images, name }: { images: { key: string; alt: string }[]; name: string }) {
  const [shown, setShown] = useState(0);
  // A lone photo is padded with tinted placeholders; a real set of photos is shown as it is.
  const shots = images.length > 1 ? images.map((i) => i.key) : [...images.map((i) => i.key), ...placeholders];

  const render = (i: number, sizes: string, main: boolean) =>
    i < images.length ? (
      <Image
        src={images[i].key}
        alt={main ? images[i].alt || (i === 0 ? name : `${name}, photo ${i + 1}`) : ""}
        fill
        sizes={sizes}
        preload={main && i === 0}
        style={{ objectFit: "cover" }}
      />
    ) : (
      <div style={{ position: "absolute", inset: 0, background: shots[i] }}>
        {main ? <PhotoTag>[Photo {i + 1}]</PhotoTag> : <span className={styles.thumbNum}>{i + 1}</span>}
      </div>
    );

  return (
    <div className={styles.gallery}>
      <ul className={styles.thumbs} aria-label="Product images">
        {shots.map((_, i) => (
          <li key={i}>
            <button
              type="button"
              className={styles.thumb}
              aria-label={`Show image ${i + 1} of ${shots.length}`}
              aria-current={i === shown}
              onClick={() => setShown(i)}
            >
              {render(i, "76px", false)}
            </button>
          </li>
        ))}
      </ul>
      {/* Keyed so each new image fades in. */}
      <div key={shown} className={styles.main}>
        {render(shown, "(max-width: 900px) 100vw, 720px", true)}
      </div>
    </div>
  );
}
