import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import AccountView from "@/components/store/AccountView";
import styles from "@/components/store/Store.module.css";
import { readAccount } from "@/lib/shopper/read";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — My account" },
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My account" }]} />
        {/* Signed-in only: readAccount redirects to /sign-in?next=/account otherwise. */}
        <Suspense fallback={<div style={{ minHeight: "50vh" }} aria-busy="true" />}>
          <Account />
        </Suspense>
      </div>
    </main>
  );
}

async function Account() {
  const { profile, addresses, wishlistCount } = await readAccount();
  return <AccountView profile={profile} addresses={addresses} wishlistCount={wishlistCount} />;
}
