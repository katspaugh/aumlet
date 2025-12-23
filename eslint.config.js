import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.ts', '*.config.js'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.worklet.json'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...prettierConfig.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['src/worklet/**/*.ts'],
    languageOptions: {
      globals: {
        sampleRate: 'readonly',
        currentFrame: 'readonly',
        currentTime: 'readonly',
        registerProcessor: 'readonly',
        AudioWorkletProcessor: 'readonly',
        MessagePort: 'readonly',
        MessageEvent: 'readonly',
        window: 'off',
        document: 'off',
      },
    },
    rules: {
      'no-restricted-globals': ['error', 'window', 'document'],
    },
  },
];
