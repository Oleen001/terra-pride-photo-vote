import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "heic-convert"],
  // We run `tsc` locally — skip type-check during build to keep memory/time low.
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Allow large photo uploads (incl. iPhone HEIC, up to ~20MB) through
    // Server Actions; images are downscaled server-side before storage.
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eljdnhxehkredjwqfypp.supabase.co",
        pathname: "/**",
      },
      // Demo/seed images (Lorem Picsum sources from Unsplash) — remove before launch
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
