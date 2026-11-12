import type { Metadata } from "next";
import { getNavEditor } from "@/lib/admin/queries/catalogue";
import { PageHeader } from "@/components/admin/AdminShell";
import NavigationEditor from "@/components/admin/catalogue/NavigationEditor";

export const metadata: Metadata = { title: "Navigation" };

export default async function NavigationPage() {
  const data = await getNavEditor();
  return (
    <>
      <PageHeader
        title="Navigation"
        description="The menus in the header, side menu and footer. Drag sections, groups and links to reorder."
      />
      <NavigationEditor data={data} />
    </>
  );
}
