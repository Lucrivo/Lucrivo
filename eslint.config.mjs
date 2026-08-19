import { defineConfig, globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettierConfig,
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts"]),
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "dist/**",
    "build/**",

    // Supabase local/generated
    "supabase/.temp/**",
    "src/infrastructure/database/supabase/database.types.ts",
  ]),
]);
