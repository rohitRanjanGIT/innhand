import type { ReactNode } from "react";
import { ButtonLink } from "../ui";
import styles from "./Store.module.css";

export default function EmptyState({ title, text }: { title: ReactNode; text: string }) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyText}>{text}</p>
      <ButtonLink href="/shop" variant="dark">
        Browse the shop
      </ButtonLink>
    </div>
  );
}
