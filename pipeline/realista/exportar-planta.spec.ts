import { mkdirSync, writeFileSync } from 'node:fs';

import { test } from '@playwright/test';

/**
 * Exporta la planta de un piso (grupo "planta-<piso>") del visor a GLB, para amoblarla y
 * hornearla en Blender con PLANTA=1 (D-074). Uso: PISO=2 npx playwright test -c pipeline/renders.config.ts exportar-planta
 */
const HOTEL = process.env.HOTEL ?? 'niebla-alta';
const PISO = process.env.PISO ?? '2';
test.use({ channel: 'chrome' });
test(`exportar planta ${HOTEL} ${PISO}`, async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`/h/${HOTEL}/piso/${PISO}?calidad=alto&export=1&nivel=inmersivo`);
  await page.waitForFunction(() => typeof window.__antesalaExport === 'function', null, { timeout: 120_000 });
  await page.waitForTimeout(25000);
  const b64 = await page.evaluate((p) => window.__antesalaExport!(`planta-${p}`), PISO);
  mkdirSync('.tmp/realista', { recursive: true });
  writeFileSync(`.tmp/realista/${HOTEL}-planta-${PISO}.glb`, Buffer.from(b64, 'base64'));
  console.log('GLB planta', PISO, Math.round((b64.length * 0.75) / 1024), 'KB');
});
