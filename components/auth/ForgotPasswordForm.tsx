"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import store from "@/components/store/Store.module.css";
import { authMessage, CODE_INVALID } from "./messages";
import styles from "./Auth.module.css";

const MIN_PASSWORD = 8;

/** Email, then the 6-digit code and a new password. Every other session of the account is signed out. */
export default function ForgotPasswordForm() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const requestCode = async (address: string) => {
    setBusy(true);
    setError("");
    setNote("");
    const { error: err } = await authClient.emailOtp.requestPasswordReset({ email: address });
    setBusy(false);
    // Same answer whether or not the address has an account.
    if (err && (err.status === 429 || err.code === "INVALID_EMAIL")) {
      setError(authMessage(err, "We couldn't send a code. Please try again."));
      return false;
    }
    return true;
  };

  const onEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (await requestCode(address)) {
      setEmail(address);
      setStep("reset");
    }
  };

  const onReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const otp = String(form.get("otp") ?? "").replace(/\D/g, "");
    const password = String(form.get("password") ?? "");
    if (otp.length !== 6) return setError("Enter the 6-digit code from the email.");
    if (password.length < MIN_PASSWORD) return setError(`Your new password needs at least ${MIN_PASSWORD} characters.`);
    if (password !== String(form.get("confirm") ?? "")) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    const { error: err } = await authClient.emailOtp.resetPassword({ email, otp, password });
    setBusy(false);
    if (err) return setError(authMessage(err, CODE_INVALID));
    setStep("done");
  };

  const resend = async () => {
    if (await requestCode(email)) setNote("A new code is on its way.");
  };

  if (step === "done") {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>
          Password <em>changed</em>
        </h1>
        <p className={styles.lead}>Your new password is set, and you&apos;ve been signed out everywhere else.</p>
        <Link href="/sign-in" className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`}>
          Sign in
        </Link>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>
          Choose a new <em>password</em>
        </h1>
        <p className={styles.lead}>
          If <strong>{email}</strong> has an account, we&apos;ve emailed it a 6-digit code. It expires in 10 minutes.
        </p>
        <form className={styles.form} onSubmit={onReset}>
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
          <label className={store.field}>
            <span className={store.fieldLabel}>New password</span>
            <input className={store.input} type="password" name="password" required minLength={MIN_PASSWORD} autoComplete="new-password" />
          </label>
          <label className={store.field}>
            <span className={store.fieldLabel}>Repeat new password</span>
            <input className={store.input} type="password" name="confirm" required minLength={MIN_PASSWORD} autoComplete="new-password" />
          </label>
          <p className={styles.message} data-tone="error" role="alert">
            {error}
          </p>
          <p className={styles.message} role="status">
            {note}
          </p>
          <button type="submit" className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`} disabled={busy}>
            {busy ? "Saving…" : "Set new password"}
          </button>
        </form>
        <p className={styles.alt}>
          No email?{" "}
          <button type="button" className={store.textBtn} onClick={resend}>
            Send a new code
          </button>{" "}
          or{" "}
          <button type="button" className={store.textBtn} onClick={() => setStep("email")}>
            use another email
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        Forgot your <em>password?</em>
      </h1>
      <p className={styles.lead}>Enter your email and we&apos;ll send you a code to choose a new one.</p>
      <form className={styles.form} onSubmit={onEmail}>
        <label className={store.field}>
          <span className={store.fieldLabel}>Email</span>
          <input className={store.input} type="email" name="email" required autoComplete="email" defaultValue={email} />
        </label>
        <p className={styles.message} data-tone="error" role="alert">
          {error}
        </p>
        <button type="submit" className={`ih-btn ih-btn-primary ${store.primaryBtn} ${styles.submit}`} disabled={busy}>
          {busy ? "Sending…" : "Send code"}
        </button>
      </form>
      <p className={styles.alt}>
        Remembered it? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
