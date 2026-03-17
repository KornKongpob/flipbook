import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "strapi-cdn.mango-prod.siammakro.cloud" },
      { protocol: "https", hostname: "**.siammakro.cloud" },
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "www.makro.pro" },
      { protocol: "https", hostname: "makro.pro" },
      { protocol: "https", hostname: "images.makro.pro" },
      { protocol: "https", hostname: "cdnc.heyzine.com" },
    ],
  },
};

export default nextConfig;
