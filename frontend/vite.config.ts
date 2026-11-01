import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter({
        out: "build",
      }),
      dynamicCompileOptions: ({ filename }) =>
        filename.includes("node_modules") ? undefined : { runes: true },
    }),
  ],
});
