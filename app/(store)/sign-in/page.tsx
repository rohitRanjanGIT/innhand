import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthFallback from "@/components/auth/AuthFallback";
import SignInForm from "@/components/auth/SignInForm";
import { readAuthParams, type SearchParams } from "@/components/auth/params";
import styles from "@/components/store/Store.module.css";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Sign in" },
  robots: { index: false },
};

export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Suspense fallback={<AuthFallback />}>
          <SignIn searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SignIn({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await readAuthParams(searchParams);
  if (await getSession()) redirect(next);
  return <SignInForm next={next} />;
}
