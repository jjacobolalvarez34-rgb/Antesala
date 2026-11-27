import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { test, type Page } from '@playwright/test';

/**
 * Vista guiada (D-095): el recorrido "como un video" de las inmobiliarias, prerenderizado desde
 * nuestra propia escena 3D (Premium, de día). Para cada orientación (horizontal y vertical):
 *
 * 1. llegada: la cámara sube desde la calle frente al edificio hasta verlo entero (un video);
 * 2. pisos: la torre de frente con lente largo (pisos casi rectos) y el contorno de cada piso
 *    en la imagen;
 * 3. un piso por imagen: la planta amoblada, con el contorno de cada unidad y lugar común.
 *
 * Todo queda en content/hotels/<slug>/media/guiada/ con un manifest.json que lee la página
 * /h/<slug>/guiada. Uso: HOTEL=cenit npx playwright test -c pipeline/renders.config.ts guiada.spec
 * (con el build hecho). Necesita ffmpeg para el video.
 */
test.describe.configure({ mode: 'serial' });

type V3 = [number, number, number];
type P2 = [number, number];
const slug = process.env.HOTEL ?? 'cenit';
const root = path.join(process.cwd(), 'content', 'hotels', slug);
const out = path.join(root, 'media', 'guiada');
const hotel = JSON.parse(readFileSync(path.join(root, 'hotel.json'), 'utf8'));
const ORIENTS = [
  // la torre en horizontal va más ancha que las plantas: en una ventana ancha y baja la imagen se
  // achica para que quepan todos los pisos y quedaban franjas a los lados (Jacobo, 2026-11-25)
  { name: 'h', w: 1600, h: 1000, bw: 2800 },
  { name: 'v', w: 900, h: 1600, bw: 900 },
] as const;
const FRAMES = Number(process.env.CUADROS ?? 72);
// de día y de noche (Jacobo, 2026-11-25: "que permita cambiar entre noche y día"). La cámara es la
// misma: los contornos salen de la toma de día y sirven para las dos. MOMENTO=dia|noche filtra.
const MOMENTS = [
  { name: 'dia', hora: 10, floorBg: '#ebe6dd', suffix: '' },
  { name: 'noche', hora: 21, floorBg: '#1f1e1c', suffix: '-noche' },
].filter((m) => !process.env.MOMENTO || m.name === process.env.MOMENTO);
const DEG = Math.PI / 180;

const manifestPath = path.join(out, 'manifest.json');
type Manifest = {
  version: 1;
  orients: Record<
    string,
    {
      w: number;
      h: number;
      video?: string;
      pisos?: string;
      floors?: Record<string, P2[]>;
      night?: { video?: string; pisos?: string };
      levels?: Record<string, { img: string; night?: string; w?: number; h?: number; spaces: { id: string; kind: string; poly: P2[] }[] }>;
    }
  >;
};
const manifest: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { version: 1, orients: {} };
// el fondo liso de las plantas (isolateFloor). Con el manejo de color de la escena, #ebe6dd sale
// #eae6dd en la imagen: la página usa el color medido y la planta no tiene bordes
(manifest as Manifest & { background?: string }).background ??= '#eae6dd';
// de noche: el fondo liso #1f1e1c sale igual en la imagen; el cielo de la torre, casi negro
(manifest as Manifest & { backgroundNight?: string }).backgroundNight ??= '#1f1e1c';
(manifest as Manifest & { skyNight?: string }).skyNight ??= '#121216';
const save = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');

/** Envolvente convexa de puntos 2D (monotone chain). */
function hull(pts: P2[]): P2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: P2[] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
const round = (poly: P2[]) => poly.map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000] as P2);

async function open(page: Page, url: string, hora: number, settle = 14_000, nivel = 'premium') {
  await page.addInitScript(() => {
    sessionStorage.setItem('antesala:intro', '1');
    for (const s of ['explorar', 'piso', 'unidad', 'espacio', 'mirar']) sessionStorage.setItem(`antesala:guia:${s}`, '1');
  });
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}nivel=${nivel}&calidad=alto&hora=${hora}&captura=1`);
  await page.waitForSelector('html[data-scene="on"]', { state: 'attached', timeout: 240_000 });
  await page.waitForSelector('html[data-camera="idle"]', { state: 'attached', timeout: 240_000 });
  await page.waitForFunction(() => !!window.__antesalaCaptura, null, { timeout: 60_000 });
  // la fachada horneada entra con fundido (las plantas tienen su propia espera, más abajo)
  await page.waitForTimeout(settle);
  await page.addStyleTag({
    content: 'body *{visibility:hidden!important} canvas{visibility:visible!important} body *:not(canvas):not(:has(canvas)){opacity:0!important}',
  });
  await page.waitForTimeout(500);
}

const shot = (page: Page, file: string, q = 84) => page.screenshot({ path: path.join(out, file), type: 'jpeg', quality: q });

for (const m of MOMENTS)
  for (const o of ORIENTS) {
    test(`${slug} · llegada y pisos (${o.name}, ${m.name})`, async ({ page }) => {
      test.setTimeout(900_000);
      mkdirSync(out, { recursive: true });
      await page.setViewportSize({ width: o.bw, height: o.h });
      await open(page, `/h/${slug}/explorar`, m.hora);

      const cam = await page.evaluate(() => window.__antesalaCaptura!.getCamera());
      const floors = await page.evaluate(() => window.__antesalaCaptura!.floors());
      const all = floors.flatMap((f) => f.points);
      const xs = all.map((p) => p[0]);
      const zs = all.map((p) => p[2]);
      const height = Math.max(...all.map((p) => p[1]));
      const center: V3 = [(Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2];
      const width = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
      // la vista inicial del visor es la fachada principal corrida 32° (lib/building.ts, facadePose)
      const azCam = Math.atan2(cam.position[0] - cam.target[0], cam.position[2] - cam.target[2]);
      const facade = azCam - 32 * DEG;
      const portrait = o.h > o.w;
      // el ancho de los pisos se mide contra la toma de siempre, no contra la más ancha
      const aspect = o.w / o.h;

      // final de la llegada = la vista de los pisos: casi de frente (un poco en 3/4 para dar volumen),
      // apenas desde arriba, con lente largo para que los pisos se vean rectos
      const endFov = portrait ? 30 : 22;
      // lo que hay sobre la cubierta (terraza, pérgola, barandas) también entra: en Niebla Alta, que es
      // baja y ancha, quedaba cortado
      const tall = height + 5;
      const fitV = (tall * (portrait ? 1.34 : 1.22)) / 2 / Math.tan((endFov / 2) * DEG);
      const fitH = (width * 1.5) / 2 / (Math.tan((endFov / 2) * DEG) * aspect);
      const endR = Math.max(fitV, fitH);
      const end = { az: facade + 16 * DEG, polar: 86 * DEG, r: endR, ty: tall * 0.5, fov: endFov };
      // comienzo: en la calle, cerca y mirando hacia arriba, con lente más abierto
      const start = { az: facade + 40 * DEG, polar: 93 * DEG, r: Math.max(48, height * 1.05), ty: height * 0.38, fov: portrait ? 66 : 54 };
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const pose = (t: number) => {
        const k = ease(t);
        const lerp = (a: number, b: number) => a + (b - a) * k;
        const az = lerp(start.az, end.az);
        const polar = lerp(start.polar, end.polar);
        const r = lerp(start.r, end.r);
        const ty = lerp(start.ty, end.ty);
        // la cámara a 1,7 m al comienzo (altura de una persona), subiendo con la toma
        const target: V3 = [center[0], ty, center[2]];
        const position: V3 = [target[0] + r * Math.sin(polar) * Math.sin(az), Math.max(1.7, ty + r * Math.cos(polar)), target[2] + r * Math.sin(polar) * Math.cos(az)];
        return { position, target, fov: lerp(start.fov, end.fov) };
      };

      const tmp = path.join(out, `.cuadros-${o.name}${m.suffix}`);
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp, { recursive: true });
      for (let i = 0; i < FRAMES; i++) {
        await page.evaluate((p) => window.__antesalaCaptura!.setCamera(p), pose(i / (FRAMES - 1)));
        await page.waitForTimeout(60);
        await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 88 });
      }
      // la vista de los pisos: el último cuadro, ya quieto
      await page.evaluate((p) => window.__antesalaCaptura!.setCamera(p), pose(1));
      await page.waitForTimeout(800);
      await shot(page, `pisos-${o.name}${m.suffix}.jpg`);
      const bands: Record<string, P2[]> = {};
      for (const f of floors) {
        const pts = await page.evaluate((ps) => window.__antesalaCaptura!.project(ps), f.points);
        bands[f.id] = round(hull(pts));
      }
      // el video de la llegada (H.264, arranca rápido en la web)
      // el video va a public/ (como los de la película, D-095): Safari en iPhone pide el video por
      // rangos y la ruta de los medios de la demo no los sirve
      const videoDir = path.join(process.cwd(), 'public', 'demo', 'guiada', slug);
      mkdirSync(videoDir, { recursive: true });
      const video = path.join(videoDir, `llegada-${o.name}${m.suffix}.mp4`);
      execFileSync('ffmpeg', [
        '-y',
        '-loglevel',
        'error',
        '-framerate',
        '24',
        '-i',
        path.join(tmp, 'f%03d.jpg'),
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        '26',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        video,
      ]);
      rmSync(tmp, { recursive: true, force: true });

      const prev = manifest.orients[o.name];
      if (m.name === 'noche') {
        // de noche solo cambian el video y la imagen; la toma tiene que ser la misma de día
        if (prev && prev.w !== o.bw) throw new Error(`La toma de día (${o.name}) es de otro tamaño: correr primero MOMENTO=dia`);
        manifest.orients[o.name] = {
          ...prev!,
          night: { video: `/demo/guiada/${slug}/llegada-${o.name}-noche.mp4`, pisos: `media/guiada/pisos-${o.name}-noche.jpg` },
        };
      } else {
        (manifest as Manifest & { facadeAz?: number }).facadeAz = facade;
        manifest.orients[o.name] = {
          ...(prev ?? {}),
          w: o.bw,
          h: o.h,
          video: `/demo/guiada/${slug}/llegada-${o.name}.mp4`,
          pisos: `media/guiada/pisos-${o.name}.jpg`,
          floors: bands,
        };
      }
      save();
    });

    for (const level of hotel.levels as { id: string; order: number; realista?: string }[]) {
      test(`${slug} · piso ${level.id} (${o.name}, ${m.name})`, async ({ page }) => {
        test.setTimeout(420_000);
        await page.setViewportSize({ width: o.w, height: o.h });
        await open(page, `/h/${slug}/piso/${level.id}`, m.hora, 3_000);
        const file = `piso-${level.id}-${o.name}${m.suffix}.jpg`;
        // solo el piso, sobre un fondo liso (Jacobo: "que cuando elija un piso se vea solo el piso")
        // la planta horneada (si el piso la tiene) entra con fundido y a veces tarda: se espera a que esté
      // primero que exista la planta del piso abierto (se monta después que las demás)
      await page.waitForFunction((id) => window.__antesalaCaptura!.planInfo(id).found, level.id, { timeout: 120_000, polling: 500 });
      // la planta horneada (Premium), de día y de noche. Antes llegaba unas veces sí y otras no: el
      // GLB se pedía antes de que la escena registrara su renderer y sin KTX2 no se leía (gltf.ts).
      // Si aun así no llega en un minuto, se recarga una vez; si tampoco, la toma falla en vez de
      // dejar un piso distinto a los demás (regla 9).
      if (level.realista) {
        const ready = () =>
          page
            .waitForFunction((id) => window.__antesalaCaptura!.planReady(id), level.id, { timeout: 60_000, polling: 500 })
            .then(() => true)
            .catch(() => false);
        let ok = await ready();
        if (!ok) {
          await open(page, `/h/${slug}/piso/${level.id}`, m.hora, 3_000);
          await page.waitForFunction((id) => window.__antesalaCaptura!.planInfo(id).found, level.id, { timeout: 120_000, polling: 500 });
          ok = await ready();
        }
        if (!ok) throw new Error(`piso ${level.id}: la planta horneada no llegó (se reintentó)`);
        await page.waitForTimeout(600);
      }
      const spaces = await page.evaluate(() => window.__antesalaCaptura!.spaces());
        if (!(await page.evaluate(([id, bg]) => window.__antesalaCaptura!.isolateFloor(id, bg), [level.id, m.floorBg] as const))) return;
        const pts = spaces.flatMap((sp) => sp.points);
        if (pts.length) {
          const xs = pts.map((p) => p[0]);
          const zs = pts.map((p) => p[2]);
          const c: V3 = [(Math.min(...xs) + Math.max(...xs)) / 2, pts[0]![1], (Math.min(...zs) + Math.max(...zs)) / 2];
          const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
          const portrait = o.h > o.w;
          const fov = portrait ? 34 : 28;
          // en 3/4 desde arriba, desde el lado de la fachada principal
          const az = ((manifest as Manifest & { facadeAz?: number }).facadeAz ?? 0) + 24 * DEG;
          const polar = 50 * DEG;
          const fit = (diag * (portrait ? 0.62 : 0.56)) / Math.tan((fov / 2) * DEG) / (portrait ? o.w / o.h : 1);
          await page.evaluate((p) => window.__antesalaCaptura!.setCamera(p), {
            target: c,
            position: [c[0] + fit * Math.sin(polar) * Math.sin(az), c[1] + fit * Math.cos(polar), c[2] + fit * Math.sin(polar) * Math.cos(az)] as V3,
            fov,
          });
          await page.waitForTimeout(800);
        }
        await shot(page, file);
        const projected = [];
        for (const s of spaces) {
          const pts = await page.evaluate((ps) => window.__antesalaCaptura!.project(ps), s.points);
          projected.push({ id: s.id, kind: s.kind, poly: round(pts) });
        }
        const entry = manifest.orients[o.name] ?? { w: o.w, h: o.h };
        const old = entry.levels?.[level.id];
        entry.levels = {
          ...(entry.levels ?? {}),
          [level.id]: m.name === 'noche' && old ? { ...old, night: `media/guiada/${file}` } : { ...old, img: `media/guiada/${file}`, w: o.w, h: o.h, spaces: projected },
        };
        manifest.orients[o.name] = entry;
        save();
      });
    }
  }

/**
 * Planta en 3D, opcional (Jacobo, 2026-11-27: "que haya un botón 3D pero que el predeterminado sea
 * el 2D, porque optimiza recursos"): cada planta desde GIRO_PASOS ángulos alrededor, de día, en
 * una toma de 960 × 720 que sirve para las dos orientaciones. El visor cambia la foto al arrastrar.
 * Uso: GIRO=1 HOTEL=<slug> npx playwright test -c pipeline/renders.config.ts guiada.spec -g giro
 */
const SPIN_STEPS = Number(process.env.GIRO_PASOS ?? 16);
if (process.env.GIRO) {
  for (const level of hotel.levels as { id: string; order: number; realista?: string }[]) {
    test(`${slug} · giro piso ${level.id}`, async ({ page }) => {
      test.setTimeout(600_000);
      const W = 960;
      const H = 720;
      await page.setViewportSize({ width: W, height: H });
      await open(page, `/h/${slug}/piso/${level.id}`, 10, 3_000);
      await page.waitForFunction((id) => window.__antesalaCaptura!.planInfo(id).found, level.id, { timeout: 120_000, polling: 500 });
      if (level.realista) {
        await page.waitForFunction((id) => window.__antesalaCaptura!.planReady(id), level.id, { timeout: 90_000, polling: 500 });
        await page.waitForTimeout(600);
      }
      const spaces = await page.evaluate(() => window.__antesalaCaptura!.spaces());
      if (!(await page.evaluate((id) => window.__antesalaCaptura!.isolateFloor(id, '#ebe6dd'), level.id))) return;
      // la planta sale del edificio como un cajón: se espera a que se asiente (si no, el primer
      // ángulo salía corrido)
      await page.waitForTimeout(2500);
      const pts = spaces.flatMap((sp) => sp.points);
      if (!pts.length) return;
      const xs = pts.map((p) => p[0]);
      const zs = pts.map((p) => p[2]);
      const c: V3 = [(Math.min(...xs) + Math.max(...xs)) / 2, pts[0]![1], (Math.min(...zs) + Math.max(...zs)) / 2];
      const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
      const fov = 30;
      const polar = 52 * DEG;
      // la misma distancia en todos los ángulos: la planta no cambia de tamaño al girar
      const fit = (diag * 0.6) / Math.tan((fov / 2) * DEG);
      const az0 = (manifest as Manifest & { facadeAz?: number }).facadeAz ?? 0;
      const dir = path.join(out, 'giro');
      mkdirSync(dir, { recursive: true });
      const frames: { img: string; spaces: { id: string; kind: string; poly: P2[] }[] }[] = [];
      // calentamiento: el primer cambio de cámara todavía arrastra la inercia de la anterior y el
      // primer ángulo salía corrido; se pone la cámara una vez y se espera a que se asiente
      {
        const az = az0 + 24 * DEG;
        await page.evaluate((p) => window.__antesalaCaptura!.setCamera(p), {
          target: c,
          position: [c[0] + fit * Math.sin(polar) * Math.sin(az), c[1] + fit * Math.cos(polar), c[2] + fit * Math.sin(polar) * Math.cos(az)] as V3,
          fov,
        });
        await page.waitForTimeout(1500);
      }
      for (let k = 0; k < SPIN_STEPS; k++) {
        const az = az0 + 24 * DEG + (k * 2 * Math.PI) / SPIN_STEPS;
        await page.evaluate((p) => window.__antesalaCaptura!.setCamera(p), {
          target: c,
          position: [c[0] + fit * Math.sin(polar) * Math.sin(az), c[1] + fit * Math.cos(polar), c[2] + fit * Math.sin(polar) * Math.cos(az)] as V3,
          fov,
        });
        await page.waitForTimeout(350);
        const file = `giro/piso-${level.id}-${String(k).padStart(2, '0')}.jpg`;
        await page.screenshot({ path: path.join(out, file), type: 'jpeg', quality: 78 });
        const projected = [];
        for (const s of spaces) {
          const p2 = await page.evaluate((ps) => window.__antesalaCaptura!.project(ps), s.points);
          projected.push({ id: s.id, kind: s.kind, poly: round(p2) });
        }
        frames.push({ img: `media/guiada/${file}`, spaces: projected });
      }
      const m2 = manifest as Manifest & { spin?: Record<string, { w: number; h: number; frames: typeof frames }> };
      m2.spin = { ...(m2.spin ?? {}), [level.id]: { w: W, h: H, frames } };
      save();
    });
  }
}
