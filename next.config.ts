import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // On ignore les erreurs TypeScript pour le build de prod (MVP)
  typescript: {
    ignoreBuildErrors: true,
  },
  // On ignore les erreurs de style ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;