import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    // Preview hostname of this cloud VM; localhost kept allowed for local dev.
    allowedHosts: ["pv-0ca4d0a4ba4f-f0b8a221-f54e-4c2c-bf9e-84527460e8e3.style.dev", "pv-0ca4d0a4ba4f-04cfa4a4-17c3-425c-990f-c5775eab2cf5.style.dev", "pv-0ca4d0a4ba4f-46ce2873-7447-4189-893b-13711c1b9181.style.dev", "pv-0ca4d0a4ba4f-036882e1-062d-4d79-94f0-2f3a8b757290.style.dev", "pv-0ca4d0a4ba4f-bc8950a0-0ca6-4eb7-b8e2-1acb8f4aa341.style.dev", "pv-0ca4d0a4ba4f-8f8bdedc-587b-4044-b3ba-c7b4e21a8b9b.style.dev"],
  },
});
