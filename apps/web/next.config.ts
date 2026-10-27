import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is an authenticated dashboard where every page is user/org-specific
  // and fetched client-side from the OpsFlow API — nothing here benefits from
  // static prerendering, so Cache Components/PPR stay off rather than fighting them.
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
