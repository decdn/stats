import type { NextConfig } from "next"

// A static export (out/): the page fetches the public stats file in the
// browser (lib/stats.tsx), so there's nothing to render on a server. The
// Worker serves out/ as static assets (wrangler.jsonc).
const nextConfig: NextConfig = {
  output: "export",
}

export default nextConfig
