import type { Metadata } from "next";
import { getAdminSettings } from "@/lib/admin/queries/catalogue";
import { PageHeader } from "@/components/admin/AdminShell";
import SettingsForm from "@/components/admin/catalogue/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getAdminSettings();
  return (
    <>
      <PageHeader title="Settings" description="Finish limits, cart, shipping and contact details." />
      <SettingsForm initial={settings} />
    </>
  );
}
