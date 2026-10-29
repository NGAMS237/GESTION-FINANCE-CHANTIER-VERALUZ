import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/GESTION-FINANCE-CHANTIER-VERALUZ/",
  server: { port: 5173 },
});
