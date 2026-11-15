"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";

type Tab = "colours" | "effects";

/** Colours and Effects on one page. The tab is kept in the address (?tab=effects) so links can open it. */
export default function LibraryTabs({
  initial,
  colours,
  effects,
}: {
  initial: Tab;
  colours: React.ReactNode;
  effects: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(initial);
  function change(v: string) {
    const next = v === "effects" ? "effects" : "colours";
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "effects") url.searchParams.set("tab", "effects");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  }
  return (
    <Tabs value={tab} onValueChange={change}>
      <TabsList className="mb-4">
        <TabsTrigger value="colours">Colours</TabsTrigger>
        <TabsTrigger value="effects">Effects</TabsTrigger>
      </TabsList>
      <TabsContent value="colours">{colours}</TabsContent>
      <TabsContent value="effects">{effects}</TabsContent>
    </Tabs>
  );
}
