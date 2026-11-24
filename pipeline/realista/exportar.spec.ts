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
  // la calle alrededor (D-094) y dónde va la unidad en el mundo: para que por las ventanas de las
  // fotos y los 360° se vea el barrio a la altura real del piso. Los hoteles con contexto real o
  // en terreno pueden no tenerlo: entonces las fotos siguen con el cielo solo.
  const ancla = await page.evaluate(() => window.__antesalaAnchor!('unidad-maqueta'));
  writeFileSync(`.tmp/realista/${HOTEL}-${UNIDAD}-ancla.json`, JSON.stringify(ancla));
  const ctx = await page.evaluate(() => window.__antesalaExport!('contexto').catch(() => ''));
  if (ctx) {
    writeFileSync(`.tmp/realista/${HOTEL}-contexto.glb`, Buffer.from(ctx, 'base64'));
    console.log('contexto', Math.round(ctx.length * 0.75 / 1024), 'KB, ancla', ancla.map((v) => v.toFixed(2)).join(' '));
  }
});
