import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

const apiProxyTarget = process.env.API_PROXY_TARGET || "http://localhost:3000";
const configuredHosts = (process.env.VITE_ALLOWED_HOSTS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const loopbackHosts = ["localhost", "127.0.0.1", "::1"];
const allowedHosts = Array.from(new Set([...configuredHosts, ...loopbackHosts]));

// https://vite.dev/config/
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    allowedHosts,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts,
  },
});
