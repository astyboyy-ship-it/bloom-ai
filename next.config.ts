import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma's engine out of the server bundle.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // PaintingCanvas serves the fine-art canvases at quality 78.
  images: { qualities: [75, 78] },
  // Each engine is a standalone product at one URL. The old shared-sidebar workspaces and the
  // interim /app routes point there; /demo/engine-03/deliver stays so sent prototype links keep opening.
  // Clients that request /favicon.ico without reading the page's <link rel="icon"> get the same SVG mark.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
  async redirects() {
    const to = (dest: string) => ({ destination: dest, permanent: false });
    return [
      { source: "/engine-01/app", ...to("/engine-01") },
      { source: "/engine-02/app", ...to("/engine-02") },
      { source: "/engine-03/app", ...to("/engine-03") },
      { source: "/intentpulse/app", ...to("/intentpulse") },
      { source: "/demo/engine-01/:path*", ...to("/engine-01") },
      { source: "/demo/engine-02/:path*", ...to("/engine-02") },
      { source: "/demo/engine-03", ...to("/engine-03") },
      { source: "/demo/engine-03/:sub(targets|foundry|sandbox|deliveries)", ...to("/engine-03") },
      { source: "/demo/intentpulse/:path*", ...to("/intentpulse") },
      { source: "/demo/aware-marketing", ...to("/engine-01") },
      { source: "/demo/aware-infrastructure", ...to("/engine-02") },
      { source: "/demo/shadow-workforce", ...to("/engine-03") },
    ];
  },
};

export default nextConfig;
