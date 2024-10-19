module.exports = {
  root: true,
  extends: [ 'codex/ts' ],
  exclude: [
    'packaje.json'
  ],
  env: {
    browser: true,
  },
  rules: {
    '@typescript-eslint/no-magic-numbers': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
  },
};
