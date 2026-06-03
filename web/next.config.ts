import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "52mb", // รองรับ upload สูงสุด 50MB (ตาม spec)
    },
  },
};

export default nextConfig;
