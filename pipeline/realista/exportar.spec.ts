import { writeFileSync, mkdirSync } from 'node:fs';

import { test } from '@playwright/test';

/**
 * Exporta la maqueta de una unidad desde el visor a GLB (D-074), para hornearla en Blender.
 * Uso: npx playwright test -c pipeline/renders.config.ts realista/exportar  (con UNIDAD=402)
 */
const HOTEL = process.env.HOTEL ?? 'niebla-alta';
const UNIDAD = process.env.UNIDAD ?? '402';
test.use({ channel: 'chrome' });
test(`exportar ${HOTEL} ${UNIDAD}`, async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`/h/${HOTEL}/unidad/${UNIDAD}?calidad=alto&export=1&nivel=inmersivo`);
  await page.waitForFunction(() => typeof window.__antesalaExport === 'function', null, { timeout: 120_000 });
  await page.waitForTimeout(15000);
  const b64 = await page.evaluate(() => window.__antesalaExport!('unidad-maqueta'));
  mkdirSync('.tmp/realista', { recursive: true });
  const out = `.tmp/realista/${HOTEL}-${UNIDAD}.glb`;
  writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('GLB', out, Math.round(b64.length * 0.75 / 1024), 'KB');
});
