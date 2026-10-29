import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: "Gestion Finance Chantier",
        short_name: "ChantierPro",
        description: "Gestion financière du chantier résidence Veraluz",
        start_url: "/GESTION-FINANCE-CHANTIER-VERALUZ/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#6366f1",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  base: "/GESTION-FINANCE-CHANTIER-VERALUZ/",
  server: { port: 5173 },
});
