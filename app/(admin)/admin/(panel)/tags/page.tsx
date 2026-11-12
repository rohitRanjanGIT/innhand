import type { Metadata } from "next";
import { listTags } from "@/lib/admin/queries/catalogue";
import { PageHeader } from "@/components/admin/AdminShell";
import TagsManager from "@/components/admin/catalogue/TagsManager";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const tags = await listTags();
  return (
    <>
      <PageHeader title="Tags" description="Occasions and themes products are grouped by." />
      <TagsManager tags={tags} />
    </>
  );
}
