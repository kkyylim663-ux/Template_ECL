import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * The project lives in a folder that has other lockfiles above it, so Next's
   * automatic workspace-root guess is ambiguous. Point the trace root at this
   * app (Next runs builds from here).
   */
  outputFileTracingRoot: process.cwd(),
  images: {
    // Artwork host comes from NEXT_PUBLIC_IMG_BASE. P0 loads no external images.
    remotePatterns: [],
  },
};

export default nextConfig;
