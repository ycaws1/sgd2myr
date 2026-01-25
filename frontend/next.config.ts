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
  allowedDevOrigins: [
    "192.168.0.122:3000",
    "http://192.168.0.122:3000",
  ],
};

export default withPWA(nextConfig);
