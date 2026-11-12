import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ComboConfigurator from "@/components/combos/ComboConfigurator";
import ComboGallery from "@/components/combos/ComboGallery";
import styles from "@/components/combos/Combos.module.css";
import { pieceImage } from "@/components/combos/model";
import { Eyebrow } from "@/components/ui";
import { getComboBySlug, listActiveCombos } from "@/lib/data/combos";

type Props = { params: Promise<{ slug: string }> };

// Active combos are prerendered; new ones render on first visit. With Cache Components the list
// must not be empty, so a placeholder (a 404) stands in when there are no combos yet.
export async function generateStaticParams() {
  const combos = await listActiveCombos();
  return combos.length ? combos.map((c) => ({ slug: c.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const combo = await getComboBySlug((await params).slug);
  if (!combo) return {};
  return {
    title: { absolute: `Innhand Creations — ${combo.name}` },
    description: combo.description || `${combo.pieces.map((p) => p.product.name).join(" + ")}, as a set.`,
  };
}

export default async function ComboPage({ params }: Props) {
  const combo = await getComboBySlug((await params).slug);
  if (!combo) notFound();

  // The combo's own photos, then each piece's photo in its default finish.
  const images = [
    ...combo.images,
    ...combo.pieces.flatMap((p) => {
      const img = pieceImage(p.product, p.choice);
      return img ? [{ key: img.key, alt: img.alt || p.product.name }] : [];
    }),
  ].filter((img, i, all) => all.findIndex((x) => x.key === img.key) === i);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Combos", href: "/combos" }, { label: combo.name }]} />
        <div style={{ marginTop: 28 }}>
          <ComboConfigurator
            combo={{
              id: combo.id,
              name: combo.name,
              description: combo.description,
              discount: combo.discount,
              pieces: combo.pieces,
            }}
            gallery={<ComboGallery images={images} name={combo.name} />}
            eyebrow={<Eyebrow>{`Combo of ${combo.pieces.length}`}</Eyebrow>}
          />
        </div>
      </div>
    </main>
  );
}
