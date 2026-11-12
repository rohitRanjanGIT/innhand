import { requireAdmin } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";

// The admin is per-request (session check), so its navigations are allowed to block.
export const instant = false;

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell admin={{ name: admin.name, email: admin.email }}>{children}</AdminShell>;
}
