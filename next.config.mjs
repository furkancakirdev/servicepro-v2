import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

const gitRevisionResult = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
});
const revision =
  gitRevisionResult.status === 0 && gitRevisionResult.stdout.trim().length > 0
    ? gitRevisionResult.stdout.trim()
    : randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  register: true,
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/manifest.json", revision },
    { url: "/icons/icon-192x192.png", revision },
    { url: "/icons/icon-512x512.png", revision },
    { url: "/icons/apple-touch-icon.png", revision },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

export default withSerwist(nextConfig);
