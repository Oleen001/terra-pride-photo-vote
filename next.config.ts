import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "heic-convert"],
  // We run `tsc` and eslint locally — skip them during build to keep memory
  // and time low on the small Render build instance.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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
