import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import CustomCombosCard from "@/components/admin/combos/CustomCombosCard";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { getCustomComboSettingsAdmin, listCombosAdmin } from "@/lib/admin/queries/combos";
import { formatPrice } from "@/lib/pricing";

export const metadata: Metadata = { title: "Combos" };

const statusVariant = { active: "default", draft: "secondary", archived: "outline" } as const;

export default async function CombosPage() {
  const [list, custom] = await Promise.all([listCombosAdmin(), getCustomComboSettingsAdmin()]);
  return (
    <>
      <PageHeader
        title="Combos"
        description="Ready-made sets of 2 to 4 pieces with their own photos and saving."
        actions={
          <Button asChild>
            <Link href="/admin/combos/new">
              <Plus />
              New combo
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 pl-4" />
                  <TableHead>Combo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pieces total</TableHead>
                  <TableHead className="text-right">Combo price</TableHead>
                  <TableHead className="pr-4 text-right">Saving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No combos yet.
                    </TableCell>
                  </TableRow>
                )}
                {list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4">
                      <div className="relative size-12 overflow-hidden rounded bg-muted">
                        {c.image && <Image src={c.image} alt="" fill sizes="48px" className="object-cover" />}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Link href={`/admin/combos/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.pieceNames.join(" + ")}</div>
                      {c.status === "active" && c.hidden.length > 0 && (
                        <div className="mt-1 text-xs text-amber-700">Hidden on the shop: {c.hidden.join("; ")}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status]} className="capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(c.piecesTotal)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(c.total)}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                      {formatPrice(c.saving)}
                      {c.discountType === "percent" && (
                        <span className="text-xs text-muted-foreground"> ({c.discountValue}%)</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <CustomCombosCard enabled={custom.enabled} tiers={custom.tiers} />
      </div>
    </>
  );
}
