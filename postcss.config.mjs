// Tailwind only generates utilities for stylesheets that `@import "tailwindcss"` (the admin's
// admin.css); the storefront CSS is left alone. Asset-URL rewriting is off because it corrupts the
// url() queries in next/font's generated CSS.
export default {
  plugins: { "@tailwindcss/postcss": { transformAssetUrls: false } },
};
