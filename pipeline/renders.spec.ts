import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { test, type Page } from '@playwright/test';

/**
 * Fotos ilustrativas desde la escena 3D (D-053): fachada de día y de noche,
 * un piso abierto y cada espacio de las unidades completas visto por dentro.
 * Se guardan en content/hotels/<slug>/media/renders/ y se registran en
 * hotel.json (site.exterior y la primera foto de cada espacio), con
 * fidelity "ilustrativa". Las copias (sameAs) heredan las de su plantilla.
 */
test.describe.configure({ mode: 'serial' });

const root = path.join(process.cwd(), 'content', 'hotels');
const W = 1600;
const H = 1000;

type Shot = { file: string; url: string; hour: number; alt: string; settle?: number };

async function capture(page: Page, slug: string, shot: Shot) {
  await page.addInitScript(() => {
    sessionStorage.setItem('antesala:intro', '1');
    for (const s of ['explorar', 'piso', 'unidad', 'espacio', 'mirar']) sessionStorage.setItem(`antesala:guia:${s}`, '1');
  });
  await page.goto(`${shot.url}${shot.url.includes('?') ? '&' : '?'}calidad=medio&hora=${shot.hour}`);
  await page.waitForSelector('html[data-scene="on"]', { state: 'attached', timeout: 240_000 });
  await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 240_000 });
  await page.waitForTimeout(shot.settle ?? 9000);
  // solo el canvas: sin interfaz encima
  // (con opacidad, además: los estilos de Tailwind van en capas y el panel del espacio se colaba)
  await page.addStyleTag({
    content: 'body *{visibility:hidden!important} canvas{visibility:visible!important} body *:not(canvas):not(:has(canvas)){opacity:0!important}',
  });
  await page.waitForTimeout(400);
  const out = path.join(root, slug, 'media', 'renders', shot.file);
  await page.screenshot({ path: out, type: 'jpeg', quality: 84 });
}

for (const slug of readdirSync(root)) {
  const file = path.join(root, slug, 'hotel.json');
  const hotel = JSON.parse(readFileSync(file, 'utf8'));
  if (hotel.site?.kind === 'terreno') {
    terreno(slug, file, hotel);
    continue;
  }
  if (hotel.site?.kind !== 'edificio') continue;
  mkdirSync(path.join(root, slug, 'media', 'renders'), { recursive: true });
  const h = `/h/${slug}`;
  const top = [...hotel.levels].sort((a: { order: number }, b: { order: number }) => b.order - a.order);
  const openFloor = top.find((l: { id: string }) => hotel.units.some((u: { levelId: string }) => u.levelId === l.id)) ?? top[0];

  const exterior: Shot[] = [
    { file: 'fachada-dia.jpg', url: `${h}/explorar`, hour: 16, alt: `Fachada de ${hotel.name} en la tarde (imagen ilustrativa)` },
    { file: 'fachada-noche.jpg', url: `${h}/explorar`, hour: 20, alt: `Fachada de ${hotel.name} de noche (imagen ilustrativa)`, settle: 20000 },
    { file: `piso-${openFloor.id}.jpg`, url: `${h}/piso/${openFloor.id}`, hour: 15, alt: `${openFloor.name} abierto, con la planta amoblada (imagen ilustrativa)` },
  ];
  const spaces: (Shot & { unit: string; space: string })[] = [];
  for (const u of hotel.units) {
    if ('sameAs' in u) continue;
    for (const s of u.spaces) {
      if (!s.media.some((m: { kind: string }) => m.kind === 'pano360')) continue;
      spaces.push({
        unit: u.id,
        space: s.id,
        file: `${u.id}-${s.id}.jpg`,
        url: `${h}/unidad/${u.id}/${s.id}`,
        hour: 15,
        alt: `${s.name} de ${u.name}, vista desde adentro (imagen ilustrativa)`,
      });
    }
  }

  for (const shot of [...exterior, ...spaces]) {
    test(`${slug} · ${shot.file}`, async ({ page }) => {
      test.setTimeout(420_000);
      await capture(page, slug, shot);
    });
  }

  test(`${slug} · registrar en hotel.json`, () => {
    const fresh = JSON.parse(readFileSync(file, 'utf8'));
    const media = (shot: Shot, id: string) => ({
      id,
      kind: 'photo',
      src: `media/renders/${shot.file}`,
      alt: shot.alt,
      fidelity: 'ilustrativa',
      width: W,
      height: H,
    });
    fresh.site.exterior = exterior.map((s, i) => media(s, `render-exterior-${i + 1}`));
    for (const s of spaces) {
      const unit = fresh.units.find((u: { id: string }) => u.id === s.unit);
      const space = unit?.spaces.find((x: { id: string }) => x.id === s.space);
      if (!space) continue;
      const id = `render-${s.unit}-${s.space}`;
      space.media = [
        ...space.media.filter((m: { kind: string }) => m.kind === 'pano360'),
        media(s, id),
        ...space.media.filter((m: { kind: string; id: string }) => m.kind !== 'pano360' && m.id !== id),
      ];
    }
    writeFileSync(file, `${JSON.stringify(fresh, null, 2)}\n`);
  });
}

/**
 * Glamping (D-083): el valle de día y de noche, la vista aérea, cada refugio por fuera
 * (?enfocar=) y cada espacio por dentro (la maqueta enfocada).
 */
function terreno(slug: string, file: string, hotel: { name: string; levels: { id: string; plan?: string }[]; units: { id: string; name: string; spaces: { id: string; name: string }[] }[] }) {
  mkdirSync(path.join(root, slug, 'media', 'renders'), { recursive: true });
  const h = `/h/${slug}`;
  const map = hotel.levels.find((l) => l.plan) ?? hotel.levels[0]!;
  const exterior: (Shot & { unit?: string })[] = [
    { file: 'valle-dia.jpg', url: `${h}/explorar`, hour: 16, alt: `El valle de ${hotel.name} en la tarde (imagen ilustrativa)` },
    { file: 'valle-noche.jpg', url: `${h}/explorar`, hour: 20, alt: `El valle de ${hotel.name} de noche, con los refugios encendidos (imagen ilustrativa)`, settle: 20000 },
    { file: 'vista-aerea.jpg', url: `${h}/piso/${map.id}`, hour: 12, alt: `El terreno de ${hotel.name} visto desde arriba (imagen ilustrativa)` },
    ...hotel.units.map((u) => ({
      unit: u.id,
      file: `${u.id}-exterior.jpg`,
      url: `${h}/explorar?enfocar=${u.id}`,
      hour: 16,
      alt: `${u.name} por fuera (imagen ilustrativa)`,
    })),
  ];
  const spaces: (Shot & { unit: string; space: string })[] = hotel.units.flatMap((u) =>
    u.spaces.map((s) => ({
      unit: u.id,
      space: s.id,
      file: `${u.id}-${s.id}.jpg`,
      url: `${h}/unidad/${u.id}/${s.id}`,
      hour: 15,
      alt: `${s.name} de ${u.name} (imagen ilustrativa)`,
    })),
  );
  for (const shot of [...exterior, ...spaces]) {
    test(`${slug} · ${shot.file}`, async ({ page }) => {
      test.setTimeout(420_000);
      await capture(page, slug, shot);
    });
  }
  test(`${slug} · registrar en hotel.json`, () => {
    const fresh = JSON.parse(readFileSync(file, 'utf8'));
    const media = (shot: Shot, id: string) => ({ id, kind: 'photo', src: `media/renders/${shot.file}`, alt: shot.alt, fidelity: 'ilustrativa', width: W, height: H });
    fresh.site.exterior = exterior.map((s, i) => media(s, `render-exterior-${i + 1}`));
    for (const s of spaces) {
      const unit = fresh.units.find((u: { id: string }) => u.id === s.unit);
      const space = unit?.spaces.find((x: { id: string }) => x.id === s.space);
      if (!space) continue;
      const id = `render-${s.unit}-${s.space}`;
      space.media = [media(s, id), ...space.media.filter((m: { id: string }) => m.id !== id)];
    }
    writeFileSync(file, `${JSON.stringify(fresh, null, 2)}\n`);
  });
}
