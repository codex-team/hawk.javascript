module.exports = {
  root: true,
  extends: [ 'codex/ts' ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'package.json',
    'tsconfig.json',
    'packages/*/dist/',
  ],
  env: {
    browser: true,
  },
  rules: {
    '@typescript-eslint/no-magic-numbers': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
  },
};
