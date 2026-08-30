import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence turbopack root warning (package-lock outside repo)
  turbopack: {
    root: __dirname,
  },
  // Ensure env is available at build
  experimental: {
    // optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
