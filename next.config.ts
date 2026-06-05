import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "heic-convert"],
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
    ],
  },
};

export default nextConfig;
