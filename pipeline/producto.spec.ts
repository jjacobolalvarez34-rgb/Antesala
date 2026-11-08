import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { test } from '@playwright/test';
import sharp from 'sharp';

/**
 * Capturas del producto para la página de Antesala (D-053): el recorrido en un
 * celular y el sitio del hotel de demostración. Salen en public/producto/*.webp.
 * Correr después de pnpm build (y de pnpm renders, para que el sitio tenga fotos).
 */
test.describe.configure({ mode: 'serial' });

const out = path.join(process.cwd(), 'public', 'producto');
mkdirSync(out, { recursive: true });
const h = '/h/niebla-alta';

const phone = [
  { name: 'paso-edificio', url: `${h}/explorar`, hour: 17 },
  { name: 'paso-piso', url: `${h}/piso/5`, hour: 15 },
  { name: 'paso-habitacion', url: `${h}/unidad/402`, hour: 15 },
  { name: 'paso-adentro', url: `${h}/unidad/402/sala`, hour: 15 },
];

for (const shot of phone) {
  test(`celular · ${shot.name}`, async ({ browser }) => {
    test.setTimeout(420_000);
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1.5,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
      locale: 'es-CO',
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      sessionStorage.setItem('antesala:intro', '1');
      for (const s of ['explorar', 'piso', 'unidad', 'espacio', 'mirar']) sessionStorage.setItem(`antesala:guia:${s}`, '1');
    });
    await page.goto(`${shot.url}?calidad=medio&hora=${shot.hour}`);
    await page.waitForSelector('html[data-scene="on"]', { state: 'attached', timeout: 240_000 });
    await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 240_000 });
    await page.waitForTimeout(9000);
    const png = await page.screenshot({ type: 'png' });
    await sharp(png).webp({ quality: 80 }).toFile(path.join(out, `${shot.name}.webp`));
    await ctx.close();
  });
}

test('escritorio · sitio del hotel', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1050 }, locale: 'es-CO', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(h);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).webp({ quality: 80 }).toFile(path.join(out, 'sitio-hotel.webp'));
  await ctx.close();
});
