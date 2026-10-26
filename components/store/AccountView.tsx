"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { demoAddresses, demoOrders, demoUser, demoWishlist, type Address } from "@/lib/account";
import OrderCard from "./OrderCard";
import styles from "./Store.module.css";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "addresses", label: "Addresses" },
  { id: "details", label: "Account details" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type Profile = { name: string; email: string; phone: string; orderUpdates: boolean; offers: boolean };

const SAVED_MS = 2500;

// Everything starts from dummy data; changes last until the page is reloaded.
export default function AccountView() {
  const [tab, setTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<Profile>({
    name: demoUser.name,
    email: demoUser.email,
    phone: demoUser.phone,
    orderUpdates: true,
    offers: false,
  });
  const [addresses, setAddresses] = useState<Address[]>(demoAddresses);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  // Arrow keys, Home and End move between tabs, as in a standard tab list.
  const onTabKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (i + 1) % tabs.length
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (i - 1 + tabs.length) % tabs.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={styles.accountLayout}>
      <aside className={styles.side}>
        <div className={styles.userCard}>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
          <div className={styles.userText}>
            <strong className={styles.userName}>{profile.name}</strong>
            <span className={styles.userMeta}>{profile.email}</span>
            <span className={styles.userMeta}>Member since {demoUser.memberSince}</span>
          </div>
        </div>

        <div role="tablist" aria-label="Account sections" aria-orientation="vertical" className={styles.tabs} onKeyDown={onTabKey}>
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={styles.tab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.sideLinks}>
          <Link href="/wishlist" className={styles.sideLink}>
            Wishlist ({demoWishlist.length})
          </Link>
          <Link href="/" className={styles.sideLink}>
            Sign out
          </Link>
        </div>
      </aside>

      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className={styles.panel}>
        {tab === "overview" && <Overview firstName={profile.name.split(/\s+/)[0]} onGo={setTab} />}
        {tab === "orders" && <Orders />}
        {tab === "addresses" && <Addresses list={addresses} onChange={setAddresses} defaultName={profile.name} />}
        {tab === "details" && <Details profile={profile} onSave={setProfile} />}
      </section>
    </div>
  );
}

function Overview({ firstName, onGo }: { firstName: string; onGo: (tab: TabId) => void }) {
  const inProgress = demoOrders.filter((o) => o.status !== "Delivered").length;
  return (
    <>
      <h2 className={styles.panelTitle}>
        Hello, <em>{firstName}</em>
      </h2>
      <p className={styles.panelText}>Follow your orders, manage your addresses and keep your details up to date.</p>

      <div className={styles.stats}>
        <button type="button" className={styles.stat} onClick={() => onGo("orders")}>
          <span className={styles.statNum}>{demoOrders.length}</span>
          <span className={styles.statLabel}>Orders</span>
        </button>
        <button type="button" className={styles.stat} onClick={() => onGo("orders")}>
          <span className={styles.statNum}>{inProgress}</span>
          <span className={styles.statLabel}>In progress</span>
        </button>
        <Link href="/wishlist" className={styles.stat}>
          <span className={styles.statNum}>{demoWishlist.length}</span>
          <span className={styles.statLabel}>Saved pieces</span>
        </Link>
      </div>

      <h3 className={styles.subTitle}>Latest order</h3>
      <OrderCard order={demoOrders[0]} />
    </>
  );
}

function Orders() {
  return (
    <>
      <h2 className={styles.panelTitle}>Your orders</h2>
      <p className={styles.panelText}>Every piece is poured to order, so you can follow it from the mould to your door.</p>
      <div className={styles.orderList}>
        {demoOrders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </>
  );
}

function Addresses({
  list,
  onChange,
  defaultName,
}: {
  list: Address[];
  onChange: (list: Address[]) => void;
  defaultName: string;
}) {
  const [adding, setAdding] = useState(false);

  const makeDefault = (id: string) => onChange(list.map((a) => ({ ...a, isDefault: a.id === id })));
  const remove = (id: string) => {
    const rest = list.filter((a) => a.id !== id);
    // Keep one address as the default when the default is removed.
    if (rest.length && !rest.some((a) => a.isDefault)) rest[0] = { ...rest[0], isDefault: true };
    onChange(rest);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    onChange([
      ...list,
      {
        id: `addr-${Date.now()}`,
        label: get("label") || "Other",
        name: get("name"),
        lines: [get("line1"), get("line2"), `${get("city")} ${get("pin")}`.trim()].filter(Boolean),
        phone: get("phone"),
        isDefault: list.length === 0,
      },
    ]);
    setAdding(false);
  };

  return (
    <>
      <h2 className={styles.panelTitle}>Addresses</h2>
      <p className={styles.panelText}>Where we send your pieces. The default address is picked first at checkout.</p>

      <div className={styles.addresses}>
        {list.map((a) => (
          <article key={a.id} className={styles.address} data-default={a.isDefault || undefined}>
            <div className={styles.addressHead}>
              <strong>{a.label}</strong>
              {a.isDefault && <span className={styles.badge}>Default</span>}
            </div>
            <address className={styles.addressBody}>
              {a.name}
              {a.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              <span>{a.phone}</span>
            </address>
            <div className={styles.addressActions}>
              {!a.isDefault && (
                <button type="button" className={styles.textBtn} onClick={() => makeDefault(a.id)}>
                  Set as default
                </button>
              )}
              <button type="button" className={styles.textBtn} onClick={() => remove(a.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}

        {!adding && (
          <button type="button" className={styles.addCard} onClick={() => setAdding(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add a new address
          </button>
        )}
      </div>

      {adding && (
        <form className={styles.form} onSubmit={onSubmit}>
          <h3 className={styles.subTitle}>New address</h3>
          <div className={styles.fieldRow}>
            <Field label="Label" name="label" placeholder="Home, Office…" />
            <Field label="Full name" name="name" defaultValue={defaultName} required autoComplete="name" />
          </div>
          <Field label="Address line 1" name="line1" required autoComplete="address-line1" />
          <Field label="Address line 2" name="line2" autoComplete="address-line2" />
          <div className={styles.fieldRow}>
            <Field label="City and state" name="city" required autoComplete="address-level2" />
            <Field label="PIN code" name="pin" required inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" />
          </div>
          <Field label="Phone" name="phone" type="tel" required autoComplete="tel" />
          <div className={styles.formActions}>
            <button type="submit" className={`ih-btn ih-btn-primary ${styles.primaryBtn}`}>
              Save address
            </button>
            <button type="button" className={styles.textBtn} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function Details({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), SAVED_MS);
    return () => clearTimeout(t);
  }, [saved]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    onSave({
      name: get("name") || profile.name,
      email: get("email") || profile.email,
      phone: get("phone"),
      orderUpdates: form.has("orderUpdates"),
      offers: form.has("offers"),
    });
    setSaved(true);
  };

  return (
    <>
      <h2 className={styles.panelTitle}>Account details</h2>
      <p className={styles.panelText}>We use these to confirm orders and share updates about your pieces.</p>

      <form className={styles.form} onSubmit={onSubmit}>
        <Field label="Full name" name="name" defaultValue={profile.name} required autoComplete="name" />
        <div className={styles.fieldRow}>
          <Field label="Email" name="email" type="email" defaultValue={profile.email} required autoComplete="email" />
          <Field label="Phone" name="phone" type="tel" defaultValue={profile.phone} autoComplete="tel" />
        </div>

        <fieldset className={styles.checks}>
          <legend className={styles.fieldLabel}>Keep me posted</legend>
          <label className={styles.check}>
            <input type="checkbox" name="orderUpdates" defaultChecked={profile.orderUpdates} />
            WhatsApp updates about my orders
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="offers" defaultChecked={profile.offers} />
            New collections and festive offers
          </label>
        </fieldset>

        <div className={styles.formActions}>
          <button type="submit" className={`ih-btn ih-btn-primary ${styles.primaryBtn}`}>
            Save changes
          </button>
          <span className={styles.saved} role="status">
            {saved && "Saved ✓"}
          </span>
        </div>
      </form>
    </>
  );
}

function Field({ label, ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.input} {...input} />
    </label>
  );
}
