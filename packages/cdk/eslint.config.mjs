import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    ignores: ['cdk.out/**'],
    plugins: { '@typescript-eslint': tseslint },
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-namespace': 'off',
    },
  },
];
