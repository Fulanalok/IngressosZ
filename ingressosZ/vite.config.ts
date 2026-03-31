import tailwindcss from "@tailwindcss/vite";
// import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const projectId = env.VITE_FIREBASE_PROJECT_ID || "ingressosz";
  const functionsPort =
    env.VITE_FUNCTIONS_PORT ||
    env.VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT ||
    "5001";
  const functionsRegion = env.VITE_FUNCTIONS_REGION || "southamerica-east1";
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        manifest: {
          name: "IngressosZ",
          short_name: "IngressosZ",
          description: "Seus ingressos digitais, sempre à mão.",
          theme_color: "#6366f1",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/meus-ingressos",
          icons: [
            { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          // Cache pages and assets so tickets load offline
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              // Cache Firestore/Firebase API responses (user tickets)
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "firestore-cache",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
            {
              // Cache event banner images
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "images-cache",
                expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: {
        "/functions": {
          target: `http://127.0.0.1:${functionsPort}`,
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/(functions)/, `/${projectId}/${functionsRegion}`),
        },
      },
    },
    preview: {
      host: true,
      port: 5173,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      globals: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react")) return "vendor-react";
            if (id.includes("node_modules/react-router-dom"))
              return "vendor-router";
            if (id.includes("node_modules/@tanstack/react-query"))
              return "vendor-query";
            if (id.includes("node_modules/firebase/app"))
              return "vendor-firebase-app";
            if (id.includes("node_modules/firebase/auth"))
              return "vendor-firebase-auth";
            if (id.includes("node_modules/firebase/firestore"))
              return "vendor-firebase-firestore";
            if (
              id.includes("node_modules/qr-scanner") ||
              id.includes("node_modules/qrcode")
            )
              return "vendor-qr";
            if (id.includes("node_modules/lucide-react")) return "vendor-icons";
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
  };
});
