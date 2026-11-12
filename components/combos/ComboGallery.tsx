"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./Combos.module.css";

/** The combo's photos: one large picture with thumbnails to switch between them. */
export default function ComboGallery({ images, name }: { images: { key: string; alt: string }[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const shown = images[current] ?? images[0];
  if (!shown) return null;
  return (
    <div className={`${styles.gallery} ${images.length < 2 ? styles.single : ""}`}>
      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((img, i) => (
            <li key={img.key}>
              <button
                type="button"
                className={styles.thumb}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === current}
                onClick={() => setCurrent(i)}
              >
                <Image src={img.key} alt="" fill sizes="76px" style={{ objectFit: "cover" }} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.main} key={shown.key}>
        <Image
          src={shown.key}
          alt={shown.alt || name}
          fill
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 900px) 100vw, 56vw"
          style={{ objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
