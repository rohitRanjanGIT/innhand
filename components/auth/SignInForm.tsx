"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient, GENERIC_SIGN_IN_ERROR } from "@/lib/auth-client";
import { claimGuestCart } from "@/lib/cart/actions";
import store from "@/components/store/Store.module.css";
import { authMessage, withNext } from "./messages";
import styles from "./Auth.module.css";

/** Email + password. `next` has already been checked with safeReturnTo on the server. */
export default function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError("");
    setUnverified(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setBusy(false);
      // Only reached with the right password: Better Auth has just emailed a verification code.
      if (err.code === "EMAIL_NOT_VERIFIED") setUnverified(email);
      else setError(authMessage(err, GENERIC_SIGN_IN_ERROR));
      return;
    }
    // The session hook already moved the guest cart; this is the belt-and-braces second path.
    await claimGuestCart();
    router.replace(next);
    router.refresh();
  };

  if (unverified) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>
          Verify your <em>email</em>
        </h1>
        <p className={styles.lead}>
          Your email isn&apos;t verified yet. We&apos;ve sent a 6-digit code to <strong>{unverified}</strong>. Enter it to
          finish signing in.
        </p>
        <Link
          href={withNext("/verify-email", { email: unverified, next })}
          className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`}
        >
          Enter the code
        </Link>
        <p className={styles.alt}>
          Wrong address?{" "}
          <button type="button" className={store.textBtn} onClick={() => setUnverified(null)}>
            Go back
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        Welcome <em>back</em>
      </h1>
      <p className={styles.lead}>Sign in to see your cart, wishlist and details on any device.</p>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={store.field}>
          <span className={store.fieldLabel}>Email</span>
          <input className={store.input} type="email" name="email" required autoComplete="email" />
        </label>
        <label className={store.field}>
          <span className={styles.labelRow}>
            <span className={store.fieldLabel}>Password</span>
            <Link href="/forgot-password" className={styles.link} style={{ fontSize: 13 }}>
              Forgot password?
            </Link>
          </span>
          <input className={store.input} type="password" name="password" required autoComplete="current-password" />
        </label>
        <p className={styles.message} data-tone="error" role="alert">
          {error}
        </p>
        <button type="submit" className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className={styles.alt}>
        New here? <Link href={withNext("/sign-up", { next })}>Create an account</Link>
      </p>
    </div>
  );
}
