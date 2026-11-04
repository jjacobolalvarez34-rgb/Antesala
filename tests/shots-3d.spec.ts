import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import type { Hotel } from '../lib/types';

const root = path.join(process.cwd(), 'content', 'hotels');
const hotels = readdirSync(root).map(
  (slug) => JSON.parse(readFileSync(path.join(root, slug, 'hotel.json'), 'utf8')) as Hotel,
);

// Cada navegador renderiza WebGL por software: en paralelo saturan la CPU.
test.describe.configure({ mode: 'serial' });
// Sin animaciones: la cámara salta a la pose final (lo que se revisa en la captura)
test.use({ reducedMotion: 'reduce' });

/**
 * Vista 3D: en headless el WebGL es por software (SwiftShader) y la detección
 * lo manda a lista, así que se fuerza ?calidad=medio. Captura de la pantalla.
 */
for (const hotel of hotels) {
  if (hotel.site.kind !== 'edificio') continue;
  const h = `/h/${hotel.slug}`;
  const scenes = [
    { name: 'explorar', url: `${h}/explorar` },
    ...hotel.levels.map((l) => ({ name: `piso-${l.id}`, url: `${h}/piso/${l.id}` })),
  ];
  for (const r of scenes) {
    test(`${hotel.slug} · 3d · ${r.name}`, async ({ page }, info) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${r.url}?calidad=medio`);
      await page.waitForSelector('html[data-scene="on"]', { state: 'attached', timeout: 90_000 });
      await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 60_000 });
      await page.waitForTimeout(1200);
      await expect(page.getByRole('navigation', { name: 'Reserva' }).getByRole('link', { name: /Reservar/ })).toBeVisible();
      await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-${r.name}.png` });
      expect(errors, `errores en ${r.url}`).toEqual([]);
    });
  }
}
