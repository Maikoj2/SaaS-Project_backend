import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignorar carpetas que no son del código principal de Node/TypeScript
  {
    ignores: [
      'src/test/**',
      'dist/**',
      'node_modules/**',
      'logs/**'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Reglas personalizadas flexibles para desarrollo
      '@typescript-eslint/no-explicit-any': 'off',          // Permitir 'any' temporalmente
      '@typescript-eslint/no-require-imports': 'off',        // Permitir 'require()' para Node.js
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_' 
      }],                                                   // Advertir sobre variables sin usar (excepto las que empiezan con _)
      'no-console': 'off',                                  // Permitir usar console.log
      'no-useless-escape': 'off',                           // Permitir escapes en expresiones regulares sin advertencias molestas
    },
  }
);
