import type { NextConfig } from "next";

const config: NextConfig = {
  // O pacote core é TypeScript puro, sem build: o Next compila junto
  transpilePackages: ["@milhas/core"],
};

export default config;
