import type { Metadata } from "next";
import { Suspense } from "react";
import ThemeToggle from "@/components/admin/ThemeToggle";
import AdminSignInForm from "@/components/admin/AdminSignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminSignInPage() {
  return (
    <main className="relative grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">Innhand admin</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in with the owner account.</p>
        <Suspense>
          <AdminSignInForm />
        </Suspense>
      </div>
    </main>
  );
}
