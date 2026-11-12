"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import store from "@/components/store/Store.module.css";
import { authMessage, withNext } from "./messages";
import styles from "./Auth.module.css";

const MIN_PASSWORD = 8;

/** Name, email, password. We email a 6-digit code; entering it verifies and signs the shopper in. */
export default function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (password.length < MIN_PASSWORD) {
      setError(`Your password needs at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError("");
    // An address that already has an account gets the same answer (Better Auth returns a generic
    // success when verification is required), so the form can't be used to find accounts.
    const { error: err } = await authClient.signUp.email({ name, email, password });
    if (err && !err.code?.startsWith("USER_ALREADY_EXISTS")) {
      setBusy(false);
      setError(authMessage(err, "We couldn't create your account. Please check your details and try again."));
      return;
    }
    router.push(withNext("/verify-email", { email, next }));
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        Create an <em>account</em>
      </h1>
      <p className={styles.lead}>Keep your cart and wishlist on every device, and follow your orders.</p>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={store.field}>
          <span className={store.fieldLabel}>Full name</span>
          <input className={store.input} name="name" required autoComplete="name" maxLength={80} />
        </label>
        <label className={store.field}>
          <span className={store.fieldLabel}>Email</span>
          <input className={store.input} type="email" name="email" required autoComplete="email" />
        </label>
        <label className={store.field}>
          <span className={store.fieldLabel}>Password</span>
          <input
            className={store.input}
            type="password"
            name="password"
            required
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
          />
          <span className={store.hint}>At least {MIN_PASSWORD} characters.</span>
        </label>
        <p className={styles.message} data-tone="error" role="alert">
          {error}
        </p>
        <button type="submit" className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`} disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className={styles.alt}>
        Already have an account? <Link href={withNext("/sign-in", { next })}>Sign in</Link>
      </p>
    </div>
  );
}
