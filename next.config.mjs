/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent duplicate API calls during development
  transpilePackages: [
    "@designcombo/events",
    "@designcombo/frames",
    "@designcombo/state",
    "@designcombo/timeline",
    "@designcombo/types",
    "@interactify/infinite-viewer",
    "@interactify/moveable",
    "@interactify/selection",
    "remotion",
    "@remotion/media-utils",
    "@remotion/paths",
    "@remotion/player",
    "@remotion/shapes",
    "@remotion/transitions"
  ],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

export default nextConfig;