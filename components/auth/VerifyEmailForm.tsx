"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { claimGuestCart } from "@/lib/cart/actions";
import store from "@/components/store/Store.module.css";
import { authMessage, CODE_INVALID, withNext } from "./messages";
import styles from "./Auth.module.css";

/** The 6-digit code from the email. Verifying signs the shopper in (autoSignInAfterVerification). */
export default function VerifyEmailForm({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const otp = String(new FormData(e.currentTarget).get("otp") ?? "").replace(/\D/g, "");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    const { error: err } = await authClient.emailOtp.verifyEmail({ email, otp });
    if (err) {
      setBusy(false);
      setError(authMessage(err, CODE_INVALID));
      return;
    }
    await claimGuestCart();
    router.replace(next);
    router.refresh();
  };

  const resend = async () => {
    setError("");
    setNote("");
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    if (err) setError(authMessage(err, "We couldn't send a new code. Please try again in a minute."));
    else setNote(`A new code is on its way to ${email}.`);
  };

  if (!email) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>
          Verify your <em>email</em>
        </h1>
        <p className={styles.lead}>Open this page from the sign-in or sign-up form so we know which email to verify.</p>
        <Link href={withNext("/sign-in", { next })} className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        Check your <em>email</em>
      </h1>
      <p className={styles.lead}>
        We&apos;ve sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
      </p>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={store.field}>
          <span className={store.fieldLabel}>Code</span>
          <input
            className={`${store.input} ${styles.code}`}
            name="otp"
            required
            inputMode="numeric"
            maxLength={7}
            autoComplete="one-time-code"
            autoFocus
          />
        </label>
        <p className={styles.message} data-tone="error" role="alert">
          {error}
        </p>
        <p className={styles.message} role="status">
          {note}
        </p>
        <button type="submit" className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`} disabled={busy}>
          {busy ? "Checking…" : "Verify and sign in"}
        </button>
      </form>
      <p className={styles.alt}>
        No email? Check your spam folder, or{" "}
        <button type="button" className={store.textBtn} onClick={resend}>
          send a new code
        </button>
        .
      </p>
    </div>
  );
}
