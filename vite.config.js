import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],

    server: {
        port: 5173,
        // The dev server talks to the API on a different port, so the SPA has to
        // be told where to find it. In production nginx reverse-proxies /api to
        // the same origin and this is never used.
        proxy: {
            "/api": {
                target: process.env.VITE_PROXY_TARGET ?? "http://localhost:4000",
                changeOrigin: true,
            },
        },
    },

    build: {
        target: "es2022",
        sourcemap: false,
        // Split third-party code out of the app chunk so editing a component does
        // not invalidate the cached framework bundle. Vite 8 bundles with
        // Rolldown, which takes this as a function rather than a map.
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) return undefined;
                    if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
                        return "react";
                    }
                    return "vendor";
                },
            },
        },
    },
});
