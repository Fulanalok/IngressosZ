import tailwindcss from "@tailwindcss/vite";
// import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const projectId = env.VITE_FIREBASE_PROJECT_ID || "ingressosz";
  const functionsPort =
    env.VITE_FUNCTIONS_PORT ||
    env.VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT ||
    "5001";
  const functionsRegion = env.VITE_FUNCTIONS_REGION || "southamerica-east1";
  const alias = [];

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
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
