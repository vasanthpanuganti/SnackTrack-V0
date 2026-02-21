import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find(
      (rule: unknown) => {
        if (typeof rule !== "object" || rule === null || !("test" in rule)) {
          return false;
        }
        const test = (rule as { test?: unknown }).test;
        return test instanceof RegExp ? test.test(".svg") : false;
      }
    ) as
      | {
          test?: RegExp;
          issuer?: unknown;
          resourceQuery?: { not?: RegExp[] };
          exclude?: RegExp;
        }
      | undefined;

    if (!fileLoaderRule) {
      return config;
    }

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...(fileLoaderRule.resourceQuery?.not || []), /url/] },
        use: ["@svgr/webpack"],
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "spoonacular.com",
      },
      {
        protocol: "https",
        hostname: "img.spoonacular.com",
      },
    ],
  },
};

export default nextConfig;
