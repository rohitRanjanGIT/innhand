"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light / dark / system theme for the admin. It toggles the `dark` class on <html>, which the
 * admin's `dark` variant and `.dark` palette in admin.css key off. The storage key is admin-only
 * so it never touches any storefront preference.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="innhand-admin-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
