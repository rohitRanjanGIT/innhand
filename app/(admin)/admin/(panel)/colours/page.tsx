import type { Metadata } from "next";
import { listColours, listEffects } from "@/lib/admin/queries/finishes";
import { PageHeader } from "@/components/admin/AdminShell";
import ColoursManager from "@/components/admin/catalogue/ColoursManager";
import EffectsManager from "@/components/admin/catalogue/EffectsManager";
import LibraryTabs from "@/components/admin/catalogue/LibraryTabs";

export const metadata: Metadata = { title: "Colours / Effects" };

export default async function ColoursPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const [{ tab }, colours, effects] = await Promise.all([searchParams, listColours(), listEffects()]);
  const initial = (Array.isArray(tab) ? tab[0] : tab) === "effects" ? "effects" : "colours";
  return (
    <>
      <PageHeader
        title="Colours / Effects"
        description="The palette colourways are made from, and the effects finishes can offer. Drag to reorder."
      />
      <LibraryTabs
        initial={initial}
        colours={<ColoursManager colours={colours} />}
        effects={<EffectsManager effects={effects} />}
      />
    </>
  );
}
