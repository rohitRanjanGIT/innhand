"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { deleteAddress, saveAddress, setDefaultAddress, updateProfile, type ActionResult } from "@/lib/shopper/actions";
import type { Address, Profile } from "@/lib/shopper/types";
import { authMessage } from "@/components/auth/messages";
import { ButtonLink } from "../ui";
import styles from "./Store.module.css";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "addresses", label: "Addresses" },
  { id: "details", label: "Account details" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const SAVED_MS = 2500;

/** Shows "Saved ✓" for a moment after a successful save. */
function useSaved() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), SAVED_MS);
    return () => clearTimeout(t);
  }, [saved]);
  return [saved, setSaved] as const;
}

export default function AccountView({
  profile,
  addresses,
  wishlistCount,
}: {
  profile: Profile;
  addresses: Address[];
  wishlistCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [signingOut, setSigningOut] = useState(false);
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

  const signOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
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
            <span className={styles.userMeta}>Member since {profile.memberSince}</span>
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
            Wishlist ({wishlistCount})
          </Link>
          <button
            type="button"
            className={styles.sideLink}
            onClick={signOut}
            disabled={signingOut}
            style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer", textAlign: "left" }}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className={styles.panel}>
        {tab === "overview" && (
          <Overview firstName={profile.name.split(/\s+/)[0]} wishlistCount={wishlistCount} onGo={setTab} />
        )}
        {tab === "orders" && <Orders />}
        {tab === "addresses" && <Addresses list={addresses} defaultName={profile.name} defaultPhone={profile.phone} />}
        {tab === "details" && (
          <>
            <Details profile={profile} />
            <ChangePassword />
          </>
        )}
      </section>
    </div>
  );
}

function NoOrders() {
  return (
    <div className={styles.empty}>
      <h3 className={styles.emptyTitle}>
        No orders <em>yet.</em>
      </h3>
      <p className={styles.emptyText}>
        Orders arrive with checkout. Until then, send your cart to us on WhatsApp and we will confirm it there.
      </p>
      <ButtonLink href="/shop" variant="dark">
        Browse the shop
      </ButtonLink>
    </div>
  );
}

function Overview({ firstName, wishlistCount, onGo }: { firstName: string; wishlistCount: number; onGo: (tab: TabId) => void }) {
  return (
    <>
      <h2 className={styles.panelTitle}>
        Hello, <em>{firstName}</em>
      </h2>
      <p className={styles.panelText}>Follow your orders, manage your addresses and keep your details up to date.</p>

      <div className={styles.stats}>
        <button type="button" className={styles.stat} onClick={() => onGo("orders")}>
          <span className={styles.statNum}>0</span>
          <span className={styles.statLabel}>Orders</span>
        </button>
        <button type="button" className={styles.stat} onClick={() => onGo("orders")}>
          <span className={styles.statNum}>0</span>
          <span className={styles.statLabel}>In progress</span>
        </button>
        <Link href="/wishlist" className={styles.stat}>
          <span className={styles.statNum}>{wishlistCount}</span>
          <span className={styles.statLabel}>Saved pieces</span>
        </Link>
      </div>

      <h3 className={styles.subTitle}>Latest order</h3>
      <NoOrders />
    </>
  );
}

function Orders() {
  return (
    <>
      <h2 className={styles.panelTitle}>Your orders</h2>
      <p className={styles.panelText}>Every piece is poured to order, so you can follow it from the mould to your door.</p>
      <NoOrders />
    </>
  );
}

const lines = (a: Address) =>
  [a.line1, a.line2, `${a.city}, ${a.state} ${a.pin}`].filter((l) => l.trim());

function Addresses({ list, defaultName, defaultPhone }: { list: Address[]; defaultName: string; defaultPhone: string }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (r.ok) after?.();
      else setError(r.error);
    });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    run(
      () =>
        saveAddress({
          id: editing && editing !== "new" ? editing.id : null,
          label: get("label") || "Home",
          name: get("name"),
          line1: get("line1"),
          line2: get("line2"),
          city: get("city"),
          state: get("state"),
          pin: get("pin"),
          phone: get("phone"),
          isDefault: form.has("isDefault"),
        }),
      () => setEditing(null),
    );
  };

  const current = editing && editing !== "new" ? editing : null;

  return (
    <>
      <h2 className={styles.panelTitle}>Addresses</h2>
      <p className={styles.panelText}>Where we send your pieces. The default address is picked first at checkout.</p>
      <p className={styles.error} role="alert">
        {error}
      </p>

      <div className={styles.addresses} aria-busy={pending || undefined}>
        {list.map((a) => (
          <article key={a.id} className={styles.address} data-default={a.isDefault || undefined}>
            <div className={styles.addressHead}>
              <strong>{a.label}</strong>
              {a.isDefault && <span className={styles.badge}>Default</span>}
            </div>
            <address className={styles.addressBody}>
              {a.name}
              {lines(a).map((line) => (
                <span key={line}>{line}</span>
              ))}
              <span>{a.phone}</span>
            </address>
            <div className={styles.addressActions}>
              <button type="button" className={styles.textBtn} disabled={pending} onClick={() => setEditing(a)}>
                Edit
              </button>
              {!a.isDefault && (
                <button type="button" className={styles.textBtn} disabled={pending} onClick={() => run(() => setDefaultAddress(a.id))}>
                  Set as default
                </button>
              )}
              <button type="button" className={styles.textBtn} disabled={pending} onClick={() => run(() => deleteAddress(a.id))}>
                Remove
              </button>
            </div>
          </article>
        ))}

        {!editing && (
          <button type="button" className={styles.addCard} onClick={() => setEditing("new")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add a new address
          </button>
        )}
      </div>

      {editing && (
        // Keyed so switching between addresses resets the form.
        <form key={current?.id ?? "new"} className={styles.form} onSubmit={onSubmit}>
          <h3 className={styles.subTitle}>{current ? "Edit address" : "New address"}</h3>
          <div className={styles.fieldRow}>
            <Field label="Label" name="label" placeholder="Home, Office…" defaultValue={current?.label} maxLength={30} />
            <Field label="Full name" name="name" defaultValue={current?.name ?? defaultName} required autoComplete="name" maxLength={80} />
          </div>
          <Field label="Address line 1" name="line1" defaultValue={current?.line1} required autoComplete="address-line1" maxLength={120} />
          <Field label="Address line 2" name="line2" defaultValue={current?.line2} autoComplete="address-line2" maxLength={120} />
          <div className={styles.fieldRow}>
            <Field label="City" name="city" defaultValue={current?.city} required autoComplete="address-level2" maxLength={60} />
            <Field label="State" name="state" defaultValue={current?.state} required autoComplete="address-level1" maxLength={60} />
          </div>
          <div className={styles.fieldRow}>
            <Field
              label="PIN code"
              name="pin"
              defaultValue={current?.pin}
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="postal-code"
            />
            <Field label="Phone" name="phone" type="tel" defaultValue={current?.phone ?? defaultPhone} required autoComplete="tel" />
          </div>
          <label className={styles.check}>
            <input type="checkbox" name="isDefault" defaultChecked={current?.isDefault ?? list.length === 0} />
            Use as my default address
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={`ih-btn ih-btn-primary ${styles.primaryBtn}`} disabled={pending}>
              {pending ? "Saving…" : "Save address"}
            </button>
            <button type="button" className={styles.textBtn} onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function Details({ profile }: { profile: Profile }) {
  const [saved, setSaved] = useSaved();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    start(async () => {
      setError("");
      const r = await updateProfile({
        name: get("name") || profile.name,
        phone: get("phone"),
        orderUpdates: form.has("orderUpdates"),
        offers: form.has("offers"),
      });
      if (r.ok) setSaved(true);
      else setError(r.error);
    });
  };

  return (
    <>
      <h2 className={styles.panelTitle}>Account details</h2>
      <p className={styles.panelText}>We use these to confirm orders and share updates about your pieces.</p>

      <form className={styles.form} onSubmit={onSubmit}>
        <Field label="Full name" name="name" defaultValue={profile.name} required autoComplete="name" maxLength={80} />
        <div className={styles.fieldRow}>
          <Field label="Email" name="email" type="email" defaultValue={profile.email} readOnly aria-describedby="email-note" />
          <Field label="Phone" name="phone" type="tel" defaultValue={profile.phone} autoComplete="tel" />
        </div>
        <span id="email-note" className={styles.hint}>
          Your email is how you sign in. To change it, message us.
        </span>

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

        <p className={styles.error} role="alert">
          {error}
        </p>
        <div className={styles.formActions}>
          <button type="submit" className={`ih-btn ih-btn-primary ${styles.primaryBtn}`} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
          <span className={styles.saved} role="status">
            {saved && "Saved ✓"}
          </span>
        </div>
      </form>
    </>
  );
}

function ChangePassword() {
  const [saved, setSaved] = useSaved();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const currentPassword = String(form.get("current") ?? "");
    const newPassword = String(form.get("password") ?? "");
    if (newPassword.length < 8) return setError("Your new password needs at least 8 characters.");
    if (newPassword !== String(form.get("confirm") ?? "")) return setError("The two new passwords don't match.");
    setBusy(true);
    setError("");
    // Signs out every other device; this one stays signed in.
    const { error: err } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setBusy(false);
    if (err) return setError(authMessage(err, "We couldn't change your password. Please try again."));
    formEl.reset();
    setSaved(true);
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} style={{ marginTop: 48 }}>
      <h3 className={styles.subTitle}>Change password</h3>
      <Field label="Current password" name="current" type="password" required autoComplete="current-password" />
      <div className={styles.fieldRow}>
        <Field label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <Field label="Repeat new password" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <span className={styles.hint}>
        Changing it signs you out on every other device. Forgotten it? <Link href="/forgot-password">Reset it by email</Link>.
      </span>
      <p className={styles.error} role="alert">
        {error}
      </p>
      <div className={styles.formActions}>
        <button type="submit" className={`ih-btn ih-btn-primary ${styles.primaryBtn}`} disabled={busy}>
          {busy ? "Saving…" : "Change password"}
        </button>
        <span className={styles.saved} role="status">
          {saved && "Password changed ✓"}
        </span>
      </div>
    </form>
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
