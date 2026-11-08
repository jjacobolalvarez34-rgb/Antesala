import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import type { Hotel } from '../lib/types';

const root = path.join(process.cwd(), 'content', 'hotels');
const hotels = readdirSync(root).map(
  (slug) => JSON.parse(readFileSync(path.join(root, slug, 'hotel.json'), 'utf8')) as Hotel,
);

// Cada navegador renderiza WebGL por software: en paralelo saturan la CPU.
test.describe.configure({ mode: 'serial' });
// Sin animaciones: la cámara salta a la pose final (lo que se revisa en la captura)
test.use({ reducedMotion: 'reduce' });

// La escena arranca según la hora del dispositivo; ?hora= la fija para que las capturas sean estables.
// (No se congela el reloj del navegador: GSAP mide el tiempo con Date.now y las animaciones no terminarían.)
const DAY = 15;
const NIGHT = 21;

async function openScene(page: Page, url: string, hour: number, guide = false) {
  // la guía (D-048) se captura aparte; aquí se da por vista
  if (!guide) {
    await page.addInitScript(() => {
      for (const s of ['explorar', 'piso', 'unidad', 'espacio', 'mirar']) sessionStorage.setItem(`antesala:guia:${s}`, '1');
    });
  }
  await page.goto(`${url}?calidad=medio&hora=${hour}`);
  await page.waitForSelector('html[data-scene="on"]', { state: 'attached', timeout: 90_000 });
  await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 60_000 });
  // carga progresiva (HDRI y texturas) y fondo congelado en alta
  await page.waitForTimeout(4000);
}

/**
 * Vista 3D: en headless el WebGL es por software (SwiftShader) y la detección
 * pregunta antes del 3D, así que se fuerza ?calidad=medio. Captura de la pantalla.
 */
for (const hotel of hotels) {
  if (hotel.site.kind !== 'edificio') continue;
  const h = `/h/${hotel.slug}`;
  const scenes = [
    { name: 'explorar', url: `${h}/explorar` },
    ...hotel.levels.map((l) => ({ name: `piso-${l.id}`, url: `${h}/piso/${l.id}` })),
    // maqueta de cada unidad (bloque 3) y un espacio de muestra
    ...hotel.units.filter((u) => !('sameAs' in u)).map((u) => ({ name: `unidad-${u.id}`, url: `${h}/unidad/${u.id}` })),
    ...hotel.units.slice(0, 1).flatMap((u) =>
      u.spaces.slice(0, 1).map((s) => ({ name: `unidad-${u.id}-${s.id}`, url: `${h}/unidad/${u.id}/${s.id}` })),
    ),
  ];
  for (const r of scenes) {
    test(`${hotel.slug} · 3d · ${r.name}`, async ({ page }, info) => {
      test.setTimeout(150_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await openScene(page, r.url, DAY);
      await expect(page.getByRole('navigation', { name: 'Reserva' }).getByRole('button', { name: /Reservar/ })).toBeVisible();
      await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-${r.name}.png` });
      expect(errors, `errores en ${r.url}`).toEqual([]);
    });
  }

  // telón de carga (D-052): la presentación tapa la carga del edificio y se abre sobre él
  test(`${hotel.slug} · 3d · telon`, async ({ page }, info) => {
    test.setTimeout(240_000);
    const skip = page.getByRole('button', { name: 'Saltar' });
    await page.goto(`${h}/explorar?calidad=medio&hora=${DAY}`);
    await expect(skip).toBeVisible();
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/00-telon.png` });
    await page.waitForSelector('html[data-scene="on"]', { state: 'attached', timeout: 180_000 });
    await expect(skip).toBeHidden({ timeout: 30_000 });
  });

  // cualquier habitación de la planta abre su unidad (también las copias de una unidad tipo)
  const typicalLevel = hotel.levels.find((l) => l.order === 3);
  const onLevel = typicalLevel ? hotel.units.filter((u) => u.levelId === typicalLevel.id) : [];
  const picks = [onLevel.find((u) => !('sameAs' in u)), onLevel.find((u) => 'sameAs' in u)].filter(Boolean) as typeof onLevel;
  for (const u of picks) {
    test(`${hotel.slug} · 3d · entrar-${u.id}`, async ({ page }) => {
      test.setTimeout(300_000);
      await openScene(page, `${h}/piso/${typicalLevel!.id}`, DAY);
      // la etiqueta (invisible hasta el hover) está proyectada sobre la habitación: se toca ahí
      const label = page.getByRole('list', { name: 'Unidades del piso' }).getByRole('link', { name: new RegExp(u.name) });
      const box = await label.boundingBox();
      expect(box, `etiqueta de ${u.name}`).not.toBeNull();
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2 + 24);
      await page.waitForURL(new RegExp(`/unidad/${u.id}$`), { timeout: 60_000 });
    });
  }

  test(`${hotel.slug} · 3d · guia`, async ({ page }, info) => {
    test.setTimeout(150_000);
    await openScene(page, `${h}/explorar`, DAY, true);
    await expect(page.getByRole('heading', { name: 'Así se recorre el hotel' })).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-guia.png` });
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.getByRole('heading', { name: 'Así se recorre el hotel' })).toBeHidden();
  });

  // un espacio en modo maqueta: muros recortados para verlo desde arriba
  const suite = hotel.units.find((u) => !('sameAs' in u) && u.spaces.some((s) => s.type === 'cocina'));
  const kitchen = suite?.spaces.find((s) => s.type === 'cocina');
  if (suite && kitchen) {
    test(`${hotel.slug} · 3d · espacio-maqueta`, async ({ page }, info) => {
      test.setTimeout(300_000);
      await openScene(page, `${h}/unidad/${suite.id}/${kitchen.id}`, DAY);
      await page.getByRole('button', { name: 'Maqueta' }).click();
      // salir del 360° es un salto de etapa con fundido: en WebGL por software tarda ~1 min
      await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 180_000 });
      // el corte de los muros es una animación GSAP: con WebGL por software avanza lento
      await page.waitForTimeout(20_000);
      await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-espacio-maqueta.png` });
    });
  }

  // terraza del penthouse por dentro: con baranda en los bordes (D-052)
  const terraceUnit = hotel.units.find((u) => !('sameAs' in u) && u.spaces.some((s) => s.type === 'terraza'));
  const terrace = terraceUnit?.spaces.find((s) => s.type === 'terraza');
  if (terraceUnit && terrace) {
    test(`${hotel.slug} · 3d · terraza`, async ({ page }, info) => {
      test.setTimeout(240_000);
      await openScene(page, `${h}/unidad/${terraceUnit.id}/${terrace.id}`, DAY);
      await page.waitForTimeout(6000);
      await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-terraza.png` });
    });
  }

  const typical = hotel.levels.find((l) => l.order === 3);
  if (typical) {
    test(`${hotel.slug} · 3d · piso-noche`, async ({ page }, info) => {
      test.setTimeout(150_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await openScene(page, `${h}/piso/${typical.id}`, NIGHT);
      // de noche (faroles) el WebGL por software tarda segundos por cuadro y GSAP avanza ~33 ms por cuadro lento
      await page.waitForTimeout(40_000);
      await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-piso-noche.png` });
      expect(errors).toEqual([]);
    });
  }

  test(`${hotel.slug} · 3d · noche`, async ({ page }, info) => {
    test.setTimeout(150_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openScene(page, `${h}/explorar`, NIGHT);
    await expect(page.getByRole('button', { name: 'Ver de día' })).toBeVisible();
    await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-noche.png` });
    expect(errors).toEqual([]);
  });

  test(`${hotel.slug} · 3d · fachada-siguiente`, async ({ page }, info) => {
    test.setTimeout(300_000);
    await openScene(page, `${h}/explorar`, DAY);
    await page.getByRole('button', { name: 'Fachada siguiente' }).click();
    await expect(page.getByText('Vista 2 de')).toBeVisible();
    // con WebGL por software el fundido de 1 s tarda ~45 s (GSAP avanza ~33 ms por cuadro lento)
    await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 120_000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-fachada-2.png` });
  });

  const withView = hotel.units.filter((u) => u.exterior?.length).at(-1);
  if (withView) {
    test(`${hotel.slug} · 3d · unidad-y-vista`, async ({ page }, info) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // la vista se pide desde el panel de la unidad (tocar la ventana en la fachada entra a la unidad)
      await openScene(page, `${h}/unidad/${withView.id}`, NIGHT);
      await page.getByRole('button', { name: 'Ver la vista desde la ventana' }).click();
      await expect(page.getByRole('img', { name: /Vista aproximada/ })).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-vista.png` });
      expect(errors).toEqual([]);
    });
  }
}

for (const hotel of hotels) {
  const poi = hotel.site.pois.find((p) => p.viewpoints?.length);
  if (!poi) continue;
  test(`${hotel.slug} · 3d · mirador`, async ({ page }, info) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openScene(page, `/h/${hotel.slug}/explorar`, 17);
    await page.getByRole('button', { name: poi.name, exact: true }).click();
    await page.getByRole('button', { name: /Mirar desde aquí/ }).click();
    await page.waitForSelector('html[data-viewpoint="on"]', { state: 'attached' });
    await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 60_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-mirador-1.png` });
    await page.getByRole('button', { name: 'Mirador siguiente' }).click({ force: true, timeout: 30_000 });
    await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 60_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `tests/__shots__/${info.project.name}/${hotel.slug}/3d-mirador-2.png` });
    expect(errors).toEqual([]);
  });
}
