import type { Metadata } from "next";
import { getHomeSections } from "@/lib/admin/queries/home";
import { PageHeader } from "@/components/admin/AdminShell";
import HomeSectionsForm from "@/components/admin/home/HomeSectionsForm";

export const metadata: Metadata = { title: "Home sections" };

export default async function HomeSectionsPage() {
  const { process, story } = await getHomeSections();
  return (
    <>
      <PageHeader
        title="Home sections"
        description="The text and pictures of the process (Made by Hand) and Our Story sections on the home page."
      />
      <HomeSectionsForm process={process} story={story} />
    </>
  );
}
