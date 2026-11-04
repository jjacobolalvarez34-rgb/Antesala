import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // R3F: mutar objetos de three.js (materiales, cámara, controles) es la práctica
    // recomendada para animar sin re-render. El React Compiler no está activo.
    files: ['components/scene/**/*.tsx'],
    rules: { 'react-hooks/immutability': 'off' },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'tests/__shots__/**', 'playwright-report/**', 'test-results/**', 'dist-assets/**'],
  },
];

export default config;
