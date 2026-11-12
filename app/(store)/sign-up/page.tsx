import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthFallback from "@/components/auth/AuthFallback";
import SignUpForm from "@/components/auth/SignUpForm";
import { readAuthParams, type SearchParams } from "@/components/auth/params";
import styles from "@/components/store/Store.module.css";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Create an account" },
  robots: { index: false },
};

export default function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Suspense fallback={<AuthFallback />}>
          <SignUp searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SignUp({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await readAuthParams(searchParams);
  if (await getSession()) redirect(next);
  return <SignUpForm next={next} />;
}
