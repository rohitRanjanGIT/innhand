import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ComboCard from "@/components/combos/ComboCard";
import styles from "@/components/combos/Combos.module.css";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { listActiveCombos } from "@/lib/data/combos";
import { getSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Combos",
  description: "Hand-poured pieces that belong together, as sets with a saving. Change the finish and colours of each piece.",
};

export default async function CombosPage() {
  const [combos, settings] = await Promise.all([listActiveCombos(), getSettings()]);
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Combos" }]} />

        <header className={styles.head} style={{ marginTop: 28 }}>
          <Eyebrow>Combos</Eyebrow>
          <h1 className={styles.title}>
            Better <em>together</em>
          </h1>
          <p className={styles.blurb}>
            Pieces we love side by side, with a saving. Change the finish and colours of each one; you keep the saving.
          </p>
        </header>

        {combos.length > 0 ? (
          <div className={styles.grid}>
            {combos.map((c) => (
              <ComboCard key={c.id} combo={c} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>
              New combos are <em>on the way.</em>
            </h2>
            <p className={styles.emptyText}>In the meantime, browse the shop and pick the pieces you like.</p>
            <div className={styles.actions}>
              <ButtonLink href="/shop" variant="dark">
                Browse all pieces
              </ButtonLink>
            </div>
          </div>
        )}

        {settings.customCombosEnabled && (
          <section className={styles.buildBanner} aria-labelledby="build-title">
            <div>
              <h2 id="build-title">
                Build your <em style={{ fontStyle: "italic" }}>own</em>
              </h2>
              <p>Pick any 2 to 4 pieces, choose their finishes and colours, and the more you pick, the more you save.</p>
            </div>
            <ButtonLink href="/combos/build" variant="primary">
              Build a combo
            </ButtonLink>
          </section>
        )}
      </div>
    </main>
  );
}
