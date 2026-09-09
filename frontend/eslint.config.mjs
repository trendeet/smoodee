import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["e2e/**", "dev-mock-server/**", "playwright.config.ts", "vitest.config.ts"],
  },
  {
    // CI에 린트를 처음 도입하는 시점 기준으로 이미 존재하던 위반들 — error로 두면
    // 무관한 PR까지 전부 빨간불로 시작하게 되어 임시로 warning으로 낮춰둔다. 점진적으로 정리 예정.
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
];

export default eslintConfig;
