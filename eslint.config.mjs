import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import astro from "eslint-plugin-astro"
import globals from "globals"
import ts from "typescript-eslint"

export default defineConfig(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".astro/**",
      ".shadcn-backup/**",
      ".lighthouseci/**",
      ".stryker-tmp/**",
      "coverage/**",
      "reports/**",
      "test-results/**",
      "playwright-report/**",
      "infra/.terraform/**",
      "src/components/ui/**"
    ]
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  },
  {
    files: ["infra/functions/*.js"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^handler$" }
      ]
    }
  }
)
