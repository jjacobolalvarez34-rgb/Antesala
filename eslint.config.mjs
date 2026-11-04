import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'tests/__shots__/**', 'playwright-report/**', 'test-results/**', 'dist-assets/**'],
  },
];

export default config;
