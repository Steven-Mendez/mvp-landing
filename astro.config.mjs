// @ts-check
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, envField, fontProviders } from "astro/config"

// `.env` is optional; `site` is read here, before Astro loads it.
try {
  process.loadEnvFile()
} catch (error) {
  if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ENOENT")
    throw error
}

export default defineConfig({
  // Absolute URLs (og:image, twitter:image) are built from the deployed origin.
  site: process.env.PUBLIC_SITE_URL || "http://localhost:4321",
  integrations: [react()],
  // Geist, self-hosted with a metric-matched fallback; globals.css maps it to the
  // theme's --font-family-sans.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Geist",
      cssVariable: "--font-geist",
      weights: ["100 900"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"]
    }
  ],
  // Public values, baked into the HTML at build time and validated here.
  env: {
    schema: {
      // Origin of the web app (mvp-web): "Sign in" and "Try it now" link to it.
      PUBLIC_APP_URL: envField.string({
        context: "client",
        access: "public",
        url: true,
        optional: true
      }),
      // Optional public link to the kit's source ("Get the source").
      PUBLIC_REPOSITORY_URL: envField.string({
        context: "client",
        access: "public",
        optional: true,
        url: true,
        startsWith: "https://"
      })
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
