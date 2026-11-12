import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import styles from "@/components/store/Store.module.css";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Reset your password" },
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
