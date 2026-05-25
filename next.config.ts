import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    // Allow preview panel cross-origin requests
    "space-z.ai",
  ],
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
