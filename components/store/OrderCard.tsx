import Image from "next/image";
import Link from "next/link";
import { orderSteps, shippingFor, subtotalOf, withProducts, type Order } from "@/lib/account";
import { formatPrice } from "@/lib/products";
import { WHATSAPP_URL } from "@/lib/site";
import ItemSpec from "./ItemSpec";
import styles from "./Store.module.css";

export default function OrderCard({ order }: { order: Order }) {
  const items = withProducts(order.items);
  const subtotal = subtotalOf(order.items);
  const total = subtotal + shippingFor(subtotal);
  const step = orderSteps.indexOf(order.status);
  const delivered = order.status === "Delivered";

  return (
    <article className={styles.order}>
      <header className={styles.orderHead}>
        <div className={styles.orderHeadText}>
          <span className={styles.orderId}>Order {order.id}</span>
          <span className={styles.orderMeta}>
            Placed {order.placed} · {formatPrice(total)}
          </span>
        </div>
        <span className={styles.statusPill} data-done={delivered || undefined}>
          {order.status}
        </span>
      </header>

      <ol className={styles.tracker} aria-label={`Order progress: ${order.status}`}>
        {orderSteps.map((s, i) => (
          <li key={s} data-state={i < step ? "done" : i === step ? "current" : "todo"} aria-current={i === step ? "step" : undefined}>
            <span className={styles.trackerLabel}>{s}</span>
          </li>
        ))}
      </ol>

      <ul className={styles.orderItems}>
        {items.map((l, i) => (
          <li key={`${l.slug}-${i}`} className={styles.orderItem}>
            <Link href={l.product.href} className={`${styles.thumb} ${styles.thumbSmall}`} tabIndex={-1} aria-hidden="true">
              <Image src={l.product.image} alt="" fill sizes="64px" unoptimized={l.product.image.endsWith(".svg")} style={{ objectFit: "cover" }} />
            </Link>
            <div className={styles.lineInfo}>
              <Link href={l.product.href} className={styles.lineName}>
                {l.product.name}
              </Link>
              <ItemSpec colour={l.colour} finish={l.finish} />
              <span className={styles.unit}>Qty {l.qty}</span>
            </div>
            <span className={styles.lineTotal}>{formatPrice(l.product.price * l.qty)}</span>
          </li>
        ))}
      </ul>

      <footer className={styles.orderFoot}>
        <a href={WHATSAPP_URL} className={styles.textLink}>
          Questions about this order? Chat on WhatsApp
        </a>
        {delivered && items[0] && (
          <Link href={items[0].product.href} className={styles.textLink}>
            Buy again
          </Link>
        )}
      </footer>
    </article>
  );
}
