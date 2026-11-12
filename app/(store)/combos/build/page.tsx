import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import BuildConfigurator from "@/components/combos/BuildConfigurator";
import styles from "@/components/combos/Combos.module.css";
import { discountLabel } from "@/components/combos/model";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { listBuildProducts, listComboTiers } from "@/lib/data/combos";
import { getSettings } from "@/lib/data/settings";
import { formatPrice } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Build your own combo",
  description: "Pick 2 to 4 hand-poured pieces, choose their finishes and colours, and save on the set.",
};

const crumbs = [{ label: "Home", href: "/" }, { label: "Combos", href: "/combos" }, { label: "Build your own" }];

export default async function BuildComboPage() {
  const settings = await getSettings();

  if (!settings.customCombosEnabled) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <Breadcrumbs items={crumbs} />
          <div className={styles.empty} style={{ marginTop: 28 }}>
            <h1 className={styles.emptyTitle}>
              Build your own is <em>taking a break.</em>
            </h1>
            <p className={styles.emptyText}>
              Our ready-made combos still come with a saving, and you can change the finish and colours of every piece.
            </p>
            <div className={styles.actions}>
              <ButtonLink href="/combos" variant="dark">
                See our combos
              </ButtonLink>
              <ButtonLink href="/shop" variant="ghost">
                Browse all pieces
              </ButtonLink>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const [products, tiers] = await Promise.all([listBuildProducts(), listComboTiers()]);
  const best = tiers.filter((t) => t.discount.value > 0).at(-1);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={crumbs} />
        <header className={styles.head} style={{ marginTop: 28 }}>
          <Eyebrow>Build your own</Eyebrow>
          <h1 className={styles.title}>
            Your set, <em>your colours</em>
          </h1>
          <p className={styles.blurb}>
            Pick any 2 to 4 pieces and make each one yours.
            {best ? ` Choose ${best.itemCount} and save ${discountLabel(best.discount, formatPrice)}.` : ""}
          </p>
        </header>
        <BuildConfigurator products={products} tiers={tiers} />
      </div>
    </main>
  );
}
