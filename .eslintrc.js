module.exports = {
  root: true,
  extends: [ 'codex/ts' ],
  env: {
    browser: true,
  },
  rules: {
    '@typescript-eslint/no-magic-numbers': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
  },
};
