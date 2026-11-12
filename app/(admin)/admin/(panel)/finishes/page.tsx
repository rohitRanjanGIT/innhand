import type { Metadata } from "next";
import { listFinishes } from "@/lib/admin/queries/finishes";
import { PageHeader } from "@/components/admin/AdminShell";
import FinishesList from "@/components/admin/catalogue/FinishesList";

export const metadata: Metadata = { title: "Finishes" };

export default async function FinishesPage() {
  const { finishes, scc, sec } = await listFinishes();
  return (
    <>
      <PageHeader
        title="Finishes"
        description="Colour slots, effects and ready-made colourways for each finish. Drag to reorder."
      />
      <FinishesList finishes={finishes} scc={scc} sec={sec} />
    </>
  );
}
