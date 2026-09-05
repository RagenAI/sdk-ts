/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  ignorePatterns: ["dist", "node_modules", "coverage", "*.cjs"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": "warn",
    "no-constant-condition": ["error", { checkLoops: false }],
    // Always brace control statements. A single-line body reads fine until
    // someone adds a second statement under it and the indentation lies
    // about what the branch covers.
    curly: ["error", "all"],
  },
  overrides: [
    {
      files: ["tests/**/*.ts", "examples/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
