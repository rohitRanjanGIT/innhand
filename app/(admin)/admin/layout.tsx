import type { Metadata } from "next";
import { jost } from "@/lib/fonts";
import ThemeProvider from "@/components/admin/ThemeProvider";
import { Toaster } from "@/components/admin/ui/sonner";
import { TooltipProvider } from "@/components/admin/ui/tooltip";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Innhand admin" },
  robots: { index: false, follow: false },
};

/** The admin's own root layout: Tailwind + shadcn load only here, never on the storefront. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the `dark` class on <html> before hydration.
    <html lang="en" className={jost.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
