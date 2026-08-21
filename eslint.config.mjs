import { defineConfig, globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettierConfig,
  globalIgnores([
    ".agents/**",
    ".codex/**",
    ".next/**",
    "coverage/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "node_modules/**",
    "supabase/.temp/**",
  ]),
]);
