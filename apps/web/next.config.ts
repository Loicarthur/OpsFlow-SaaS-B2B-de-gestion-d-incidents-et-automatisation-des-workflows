import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is an authenticated dashboard where every page is user/org-specific
  // and fetched client-side from the OpsFlow API — nothing here benefits from
  // static prerendering, so Cache Components/PPR stay off rather than fighting them.
  output: "standalone",
  // The dashboard's own sidebar also has a bottom-left "Sign out" control — without this,
  // Next's dev-mode indicator badge sits on top of it and intercepts clicks during `next dev`.
  devIndicators: {
    position: "bottom-right",
  },
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
