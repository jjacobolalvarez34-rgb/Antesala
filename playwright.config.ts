import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SHOTS_PORT ?? 3100);

/**
 * pnpm shots: capturas de todas las rutas a 390×844 y 1440×900 en tests/__shots__/.
 * Corre contra el build de producción (correr pnpm build antes).
 */
export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-CO',
  },
  projects: [
    {
      name: 'movil',
      use: { ...devices['iPhone 14'], browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
