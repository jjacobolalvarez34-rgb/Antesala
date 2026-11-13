import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.SHOTS_PORT ?? 3100);

/**
 * pnpm renders: fotos ilustrativas tomadas de la escena 3D (D-053) para la
 * página del hotel y las galerías. Corre contra el build (pnpm build antes).
 */
export default defineConfig({
  testDir: '.',
  testMatch: /(renders|producto|exportar|exportar-edificio|exportar-planta)\.spec\.ts$/,
  outputDir: '../test-results/renders',
  reporter: [['line']],
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-CO',
    browserName: 'chromium',
    viewport: { width: 1600, height: 1000 },
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // el servidor corre en la raíz del repo (donde está el build), no en pipeline/
    cwd: process.cwd(),
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
