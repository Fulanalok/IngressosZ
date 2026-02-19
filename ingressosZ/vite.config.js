var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import tailwindcss from "@tailwindcss/vite";
// import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
// https://vite.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var projectId = env.VITE_FIREBASE_PROJECT_ID || "ingressosz";
    var functionsPort = env.VITE_FUNCTIONS_PORT || "5001";
    var alias = mode === "production"
        ? [
            { find: "react", replacement: "preact/compat" },
            { find: "react-dom", replacement: "preact/compat" },
            { find: "react/jsx-runtime", replacement: "preact/jsx-runtime" },
        ]
        : [];
    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: __spreadArray([
                { find: "@", replacement: path.resolve(__dirname, "./src") }
            ], alias, true),
        },
        server: {
            host: true,
            port: 5173,
            strictPort: false,
            proxy: {
                "/functions": {
                    target: "http://127.0.0.1:".concat(functionsPort),
                    changeOrigin: true,
                    rewrite: function (path) {
                        return path.replace(/^\/(functions)/, "/".concat(projectId, "/us-central1"));
                    },
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
                    manualChunks: function (id) {
                        if (id.includes("node_modules/react"))
                            return "vendor-react";
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
                        if (id.includes("node_modules/qr-scanner") ||
                            id.includes("node_modules/qrcode"))
                            return "vendor-qr";
                        if (id.includes("node_modules/lucide-react"))
                            return "vendor-icons";
                    },
                },
            },
            chunkSizeWarningLimit: 700,
        },
    };
});
