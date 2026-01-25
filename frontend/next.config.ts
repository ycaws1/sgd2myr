import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow empty turbopack config to silence the warning
  // next-pwa uses webpack, so we need to build with --webpack flag
  turbopack: {},
};

export default withPWA(nextConfig);
