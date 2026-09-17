import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @superdoc/sdk ships a platform-specific native binary package (e.g.
  // @superdoc/sdk-darwin-arm64) alongside license/doc files Next's bundler
  // can't classify as a module ("Unknown module type" build error). Treating
  // it as external makes Next require() it at runtime like plain Node.js
  // instead of trying to bundle it — same reason puppeteer/sharp/etc. are on
  // Next's own default-external list, which this package isn't on yet.
  serverExternalPackages: ["@superdoc/sdk"],
};

export default nextConfig;
