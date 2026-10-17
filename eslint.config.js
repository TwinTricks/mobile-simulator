import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dist-dev/**",
      "dist-crx/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "ref/**",
      "public/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts", "e2e/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        chrome: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // These run in Node rather than in the browser.
    files: ["scripts/**/*.ts", "e2e/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Playwright fixtures are plain functions named after what they provide, and an empty
    // pattern is how a fixture says it needs none of the others.
    files: ["e2e/**/*.ts"],
    rules: {
      "no-empty-pattern": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Last, so layout is Prettier's business and never a lint failure.
  prettier,
);
