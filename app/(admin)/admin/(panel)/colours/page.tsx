import type { Metadata } from "next";
import { listColours } from "@/lib/admin/queries/finishes";
import { PageHeader } from "@/components/admin/AdminShell";
import ColoursManager from "@/components/admin/catalogue/ColoursManager";

export const metadata: Metadata = { title: "Colours" };

export default async function ColoursPage() {
  const colours = await listColours();
  return (
    <>
      <PageHeader title="Colours" description="The palette colourways are made from. Drag to reorder." />
      <ColoursManager colours={colours} />
    </>
  );
}
