import { mkdirSync, writeFileSync } from 'node:fs';

import { test } from '@playwright/test';

/** Exporta el edificio (grupo "edificio") del visor a GLB para hornear la fachada (D-074). */
const HOTEL = process.env.HOTEL ?? 'niebla-alta';
test.use({ channel: 'chrome' });
test(`exportar edificio ${HOTEL}`, async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`/h/${HOTEL}/explorar?calidad=alto&export=1&nivel=inmersivo`);
  await page.waitForFunction(() => typeof window.__antesalaExport === 'function', null, { timeout: 120_000 });
  await page.waitForTimeout(25000);
  const b64 = await page.evaluate(() => window.__antesalaExport!('edificio'));
  mkdirSync('.tmp/realista', { recursive: true });
  writeFileSync(`.tmp/realista/${HOTEL}-edificio.glb`, Buffer.from(b64, 'base64'));
  console.log('GLB edificio', Math.round((b64.length * 0.75) / 1024), 'KB');
});
