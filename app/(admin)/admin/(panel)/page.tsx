import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { carts, combos, products, user } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireAdmin();
  const [[p], [d], [c], [s], [a]] = await Promise.all([
    db.select({ n: count() }).from(products).where(eq(products.status, "active")),
    db.select({ n: count() }).from(products).where(eq(products.status, "draft")),
    db.select({ n: count() }).from(combos).where(eq(combos.status, "active")),
    db.select({ n: count() }).from(user).where(eq(user.role, "customer")),
    db
      .select({ n: count() })
      .from(carts)
      .where(
        and(eq(carts.status, "active"), sql`exists (select 1 from cart_items ci where ci.cart_id = ${carts.id})`),
      ),
  ]);
  const stats = [
    { label: "Active products", value: p.n, href: "/admin/products" },
    { label: "Drafts", value: d.n, href: "/admin/products?status=draft" },
    { label: "Active combos", value: c.n, href: "/admin/combos" },
    { label: "Shoppers", value: s.n, href: "/admin/shoppers" },
    { label: "Carts with items", value: a.n },
  ];
  return (
    <>
      <PageHeader title="Dashboard" description="Orders arrive in the next phase." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => {
          const card = (
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{s.value}</CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>
    </>
  );
}
