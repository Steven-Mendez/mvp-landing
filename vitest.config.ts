/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config"

// Component/unit fixtures exercise the connected variant. E2E builds cover both modes.
process.env.PUBLIC_APP_URL ??= "http://localhost:3000"

// getViteConfig loads astro.config.mjs, so tests resolve `@/`, `astro:env/client`,
// `astro:assets` and `astro:container` exactly as the site does.
export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node"
        }
      },
      {
        extends: true,
        test: {
          // Astro components render on the server (node); React component tests opt
          // into jsdom with a `@vitest-environment jsdom` docblock.
          name: "component",
          include: ["tests/component/**/*.test.{ts,tsx}"],
          environment: "node",
          setupFiles: ["tests/component/setup.ts"]
        }
      }
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx,astro}"],
      exclude: ["src/env.d.ts", "src/components/ui/**"],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 }
    }
  }
})
