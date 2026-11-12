import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthFallback from "@/components/auth/AuthFallback";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";
import { readAuthParams, type SearchParams } from "@/components/auth/params";
import styles from "@/components/store/Store.module.css";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Verify your email" },
  robots: { index: false },
};

export default function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Suspense fallback={<AuthFallback />}>
          <Verify searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Verify({ searchParams }: { searchParams: SearchParams }) {
  const { next, email } = await readAuthParams(searchParams);
  if (await getSession()) redirect(next);
  return <VerifyEmailForm email={email} next={next} />;
}
