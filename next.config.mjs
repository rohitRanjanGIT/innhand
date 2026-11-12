/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Images are resized once at upload (lib/admin/media.ts); the loader picks the nearest size.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  serverExternalPackages: ["sharp"],
  // One setting (R2_PUBLIC_URL) serves both server and browser image URLs.
  env: { NEXT_PUBLIC_R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ?? "" },
};

export default nextConfig;
