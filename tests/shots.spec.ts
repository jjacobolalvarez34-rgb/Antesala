import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import type { Hotel } from '../lib/types';

/** Todas las rutas del recorrido de cada hotel, derivadas del contenido. */
function routesFor(hotel: Hotel): { name: string; url: string; occupied?: boolean }[] {
  const h = `/h/${hotel.slug}`;
  const list: { name: string; url: string; occupied?: boolean }[] = [
    { name: 'entrada', url: h },
    { name: 'explorar', url: `${h}/explorar` },
    { name: 'lista', url: `${h}/lista` },
    { name: 'comparar', url: `${h}/comparar` },
    { name: 'panel', url: `${h}/panel` },
    ...hotel.levels.map((l) => ({ name: `piso-${l.id}`, url: `${h}/piso/${l.id}` })),
  ];
  for (const u of hotel.units) {
    list.push({ name: `unidad-${u.id}`, url: `${h}/unidad/${u.id}`, occupied: u.occupied });
    // las copias de una unidad tipo (sameAs, D-047) tienen los mismos espacios que su plantilla
    if ('sameAs' in u) continue;
    for (const s of u.spaces) list.push({ name: `unidad-${u.id}-${s.id}`, url: `${h}/unidad/${u.id}/${s.id}`, occupied: u.occupied });
  }
  return list;
}

const root = path.join(process.cwd(), 'content', 'hotels');
const hotels = readdirSync(root).map(
  (slug) => JSON.parse(readFileSync(path.join(root, slug, 'hotel.json'), 'utf8')) as Hotel,
);

test('raíz', async ({ page }, info) => {
  await page.goto('/');
  await page.screenshot({ path: `tests/__shots__/${info.project.name}/00-raiz.png`, fullPage: true });
});

for (const hotel of hotels) {
  for (const [i, r] of routesFor(hotel).entries()) {
    test(`${hotel.slug} · ${r.name}`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

      // la entrada de marca (D-043) se captura aparte; aquí se da por vista
      await page.addInitScript(() => sessionStorage.setItem('antesala:intro', '1'));
      const res = await page.goto(r.url);
      expect(res?.status(), r.url).toBe(200);
      await page.waitForLoadState('networkidle');

      // Reservar siempre visible (regla 4 de CLAUDE.md)
      // Reservar siempre visible para el huésped (el panel es para el gerente)
      // (en una unidad ocupada, D-054, la barra propone la alternativa libre)
      if (r.occupied) {
        await expect(page.getByRole('navigation', { name: 'Reserva' }).getByRole('link', { name: /libre|disponible/ })).toBeVisible();
      } else if (r.name !== 'panel') {
        // hotel: "Reservar"; venta o arriendo (D-057): "Agendar visita"
        const cta = (hotel.offer ?? 'noche') === 'noche' ? /Reservar/ : /Agendar visita/;
        await expect(page.getByRole('navigation', { name: 'Reserva' }).getByRole((hotel.offer ?? 'noche') === 'noche' ? 'button' : 'link', { name: cta })).toBeVisible();
      }
      if (hotel.isDemo) await expect(page.getByText(hotel.demoNote ?? 'Hotel ficticio · imágenes ilustrativas')).toBeVisible();

      // Ninguna imagen cargada puede estar rota (las lazy sin cargar se ignoran)
      const broken = await page.$$eval('img', (imgs) =>
        imgs.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      );
      expect(broken, `imágenes rotas en ${r.url}`).toEqual([]);

      const n = String(i + 1).padStart(2, '0');
      await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/${n}-${r.name}.pantalla.png` });
      await page.screenshot({
        path: `tests/__shots__/${info.project.name}/${hotel.slug}/${n}-${r.name}.png`,
        fullPage: true,
      });
      expect(errors, `errores de consola en ${r.url}`).toEqual([]);
    });
  }
}
