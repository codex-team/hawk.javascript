import CodeX from 'eslint-config-codex';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...CodeX,
  {
    files: ['**/*.ts'],
    ignores: [
      'dist/',
      'node_modules/',
      'package.json',
      'tsconfig.json',
      'packages/*/dist/',
    ],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Current eslint version (9.39.2) has no alias resolver so this error is unfixable
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      // TODO: enable rules below and resolve related eslint errors
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@stylistic/array-bracket-spacing': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/quote-props': 'off',
      '@stylistic/block-spacing': 'off',
      '@stylistic/object-curly-spacing': 'off',
      '@stylistic/no-multi-spaces': 'off',
      '@stylistic/no-multiple-empty-lines': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/tag-lines': 'off',
      'jsdoc/no-types': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/informative-docs': 'off',
    },
  },
];
