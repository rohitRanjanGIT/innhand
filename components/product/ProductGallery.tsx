"use client";

import Image from "next/image";
import { useState } from "react";
import { PhotoTag } from "../ui";
import styles from "./Product.module.css";

// Tints for the extra shots until there are real photos of each piece.
const placeholders = ["#EBCFC8", "#DCDFD1", "#D3DAE0"];

export default function ProductGallery({ image, name }: { image: string; name: string }) {
  const [shown, setShown] = useState(0);
  const shots = [image, ...placeholders];

  const render = (i: number, sizes: string, main: boolean) =>
    i === 0 ? (
      <Image
        src={image}
        alt={main ? name : ""}
        fill
        sizes={sizes}
        preload={main}
        unoptimized={image.endsWith(".svg")}
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
