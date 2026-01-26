module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
    "jest.config.js",
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "max-len": ["error", { code: 120, ignoreUrls: true }],
    "object-curly-spacing": ["error", "always"],
    "no-empty": ["error", { allowEmptyCatch: true }],
    "require-jsdoc": "off",
    "operator-linebreak": "off",
    "space-before-function-paren": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "linebreak-style": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};
