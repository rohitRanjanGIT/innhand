import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import AccountView from "@/components/store/AccountView";
import styles from "@/components/store/Store.module.css";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — My account" },
};

export default function AccountPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My account" }]} />
        <AccountView />
      </div>
    </main>
  );
}
