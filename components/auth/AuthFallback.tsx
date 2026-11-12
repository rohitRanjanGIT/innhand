import styles from "./Auth.module.css";

/** Holds the card's space while the page reads the URL and session. */
export default function AuthFallback() {
  return <div className={styles.card} style={{ minHeight: 420 }} aria-busy="true" />;
}
