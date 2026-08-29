module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Not tsconfig.json: that one excludes **/*spec.ts so the build does not
    // compile tests into dist, which left every spec file unlintable. This
    // config extends it and includes them.
    project: 'tsconfig.eslint.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  // scripts/ holds standalone CommonJS ops scripts run outside the Nest
  // build (require('dotenv').config(), no TS, no import syntax by design).
  // tsconfig.eslint.json's project does not include them, which without this
  // makes every one of them an unparseable-file error rather than a normal
  // lint result the moment VS Code's ESLint extension opens one.
  ignorePatterns: ['.eslintrc.js', 'scripts/**'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // ignoreRestSiblings covers the omit idiom — `const { password, ...rest }`
    // to strip a secret before logging. The named bindings are meant to be
    // discarded; that is the whole point of writing it that way.
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
  },
};
