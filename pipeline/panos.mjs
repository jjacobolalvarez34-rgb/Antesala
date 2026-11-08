#!/usr/bin/env node
/**
 * Panoramas 360° placeholder (equirectangulares) por espacio, con geometría
 * correcta: desde el punto de vista del espacio (centro, a 1,5 m) se calcula
 * dónde caen paredes, piso, techo, ventanas y puertas del plano real, como en
 * una foto 360° de verdad. También genera los hotspots hacia los espacios
 * vecinos. Se reemplazan por renders en el bloque 5.
 *
 *   node pipeline/panos.mjs [slug] [--force]
 *
 * Convención del visor: la columna u del equirectangular mira en la dirección
 * (x, z) = (cos 2πu, sin 2πu) del plano (x del SVG → x, y del SVG → z).
 * El yaw de un hotspot usa la misma convención: yaw = atan2(dz, dx).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'content', 'hotels');
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));

const W = 4096;
const H = 2048;
const EYE = 1.5;
const CEIL = 2.6;
const SILL = 0.9;
const HEAD = 2.2;
const DOOR = 2.1;

const PALETTE = {
  dormitorio: { wall: '#e8e1d6', floor: '#a57f5c' },
  sala: { wall: '#ebe5dc', floor: '#a57f5c' },
  estudio: { wall: '#ebe5dc', floor: '#a57f5c' },
  comedor: { wall: '#ebe5dc', floor: '#a57f5c' },
  cocina: { wall: '#ece9e3', floor: '#cfcac1' },
  bano: { wall: '#eceeec', floor: '#d9d6d0' },
  vestier: { wall: '#e8e1d6', floor: '#a57f5c' },
  balcon: { wall: '#d4d9da', floor: '#8f7259', open: true },
  terraza: { wall: '#d4d9da', floor: '#8f7259', open: true },
  otro: { wall: '#e8e1d6', floor: '#a57f5c' },
};

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

function parsePlan(svg) {
  const group = (id) => svg.match(new RegExp(`<g id="${id}">([\\s\\S]*?)</g>`))?.[1] ?? '';
  const spaces = [...group('spaces').matchAll(/<polygon\b([^>]*)\/?>/g)].map((m) => {
    const a = attrs(m[1]);
    const nums = a.points.trim().split(/[\s,]+/).map(Number);
    const pts = [];
    for (let i = 0; i < nums.length; i += 2) pts.push([nums[i] / 100, nums[i + 1] / 100]);
    return { id: a.id, pts };
  });
  const openings = [...group('openings').matchAll(/<rect\b([^>]*)\/?>/g)].map((m) => {
    const a = attrs(m[1]);
    return {
      type: a['data-type'],
      x: Number(a.x) / 100,
      y: Number(a.y) / 100,
      w: Number(a.width) / 100,
      h: Number(a.height) / 100,
    };
  });
  return { spaces, openings };
}

function pointInPolygon([x, y], pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Punto representativo dentro del polígono (centro de la celda más grande de la grilla de vértices). */
function labelPoint(pts) {
  const xs = [...new Set(pts.map((p) => p[0]))].sort((a, b) => a - b);
  const ys = [...new Set(pts.map((p) => p[1]))].sort((a, b) => a - b);
  let best = null;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const c = [(xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2];
      if (!pointInPolygon(c, pts)) continue;
      const area = (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      if (!best || area > best.area) best = { area, c };
    }
  }
  return best ? best.c : [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

/** Distancia desde el ojo hasta el borde del polígono en la dirección (dx, dz). */
function rayToEdge([ox, oz], [dx, dz], pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[(i + 1) % pts.length];
    const ex = bx - ax;
    const ez = bz - az;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - ox) * ez - (az - oz) * ex) / den;
    const s = ((ax - ox) * dz - (az - oz) * dx) / den;
    if (t > 1e-6 && s >= -1e-6 && s <= 1 + 1e-6) best = Math.min(best, t);
  }
  return best;
}

const yOf = (pitch) => H / 2 - (pitch / (Math.PI / 2)) * (H / 2);
const xOf = (u) => u * W;

function pano({ name, type, pts, openings }) {
  const pal = PALETTE[type] ?? PALETTE.otro;
  const eye = labelPoint(pts);
  const N = 256;
  const floorPts = [];
  const ceilPts = [];
  const dist = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = u * 2 * Math.PI;
    const d = Math.max(0.3, rayToEdge(eye, [Math.cos(a), Math.sin(a)], pts));
    dist.push(d);
    floorPts.push(`${xOf(u).toFixed(1)},${yOf(-Math.atan2(EYE, d)).toFixed(1)}`);
    ceilPts.push(`${xOf(u).toFixed(1)},${yOf(Math.atan2(CEIL - EYE, d)).toFixed(1)}`);
  }

  // huecos del plano que tocan este espacio: su rango angular visto desde el ojo
  const near = openings.filter((o) => {
    const cx = o.x + o.w / 2;
    const cz = o.y + o.h / 2;
    const d = rayToEdge(eye, [cx - eye[0], cz - eye[1]].map((v, _, arr) => v / Math.hypot(...arr)), pts);
    return Math.abs(Math.hypot(cx - eye[0], cz - eye[1]) - d) < 0.45;
  });
  // mirada inicial: hacia la abertura vidriada más ancha (ventana o puerta corrediza)
  let lookYaw = 0;
  let widest = 0;
  for (const o of near) {
    const span = Math.max(o.w, o.h);
    if ((o.type === 'window' || span > 1.2) && span > widest) {
      widest = span;
      lookYaw = Math.atan2(o.y + o.h / 2 - eye[1], o.x + o.w / 2 - eye[0]);
    }
  }
  const shapes = near.map((o) => {
    const horizontal = o.w >= o.h;
    const ends = horizontal
      ? [
          [o.x, o.y + o.h / 2],
          [o.x + o.w, o.y + o.h / 2],
        ]
      : [
          [o.x + o.w / 2, o.y],
          [o.x + o.w / 2, o.y + o.h],
        ];
    const span = Math.max(o.w, o.h);
    // puertas anchas (corredizas a balcón o terraza): vidriadas, de piso a dintel
    const glazedDoor = o.type === 'door' && span > 1.2;
    const bottom = o.type === 'door' ? 0 : SILL;
    const top = o.type === 'door' ? (glazedDoor ? HEAD : DOOR) : HEAD;
    const steps = 24;
    const lower = [];
    const upper = [];
    for (let k = 0; k <= steps; k++) {
      const px = ends[0][0] + ((ends[1][0] - ends[0][0]) * k) / steps;
      const pz = ends[0][1] + ((ends[1][1] - ends[0][1]) * k) / steps;
      const dx = px - eye[0];
      const dz = pz - eye[1];
      const d = Math.hypot(dx, dz);
      let u = Math.atan2(dz, dx) / (2 * Math.PI);
      if (u < 0) u += 1;
      lower.push([xOf(u), yOf(Math.atan2(bottom - EYE, d))]);
      upper.push([xOf(u), yOf(Math.atan2(top - EYE, d))]);
    }
    // evita polígonos que cruzan el borde del equirectangular
    const xs = lower.map((p) => p[0]);
    if (Math.max(...xs) - Math.min(...xs) > W / 2) return '';
    const poly = [...lower, ...upper.reverse()].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    if (o.type === 'door' && !glazedDoor) {
      return `<polygon points="${poly}" fill="#b9a993" stroke="#8f8170" stroke-width="3"/>`;
    }
    // vidrio con parales verticales
    const mullions = [0.33, 0.66].map((t) => {
      const k = Math.round(t * steps);
      return `<line x1="${lower[k][0].toFixed(1)}" y1="${lower[k][1].toFixed(1)}" x2="${upper[steps - k][0].toFixed(1)}" y2="${upper[steps - k][1].toFixed(1)}" stroke="#3a3d40" stroke-width="5"/>`;
    });
    return `<polygon points="${poly}" fill="url(#sky)" stroke="#3a3d40" stroke-width="6"/>` + mullions.join('');
  });

  // esquinas: donde la distancia cambia de pendiente bruscamente
  const corners = [];
  for (let i = 1; i < N; i++) {
    const d2 = dist[i - 1] - 2 * dist[i] + dist[i + 1];
    if (Math.abs(d2) > 0.12) {
      const u = i / N;
      corners.push(
        `<line x1="${xOf(u).toFixed(1)}" y1="${yOf(Math.atan2(CEIL - EYE, dist[i])).toFixed(1)}" x2="${xOf(u).toFixed(1)}" y2="${yOf(-Math.atan2(EYE, dist[i])).toFixed(1)}" stroke="#000" stroke-opacity="0.08" stroke-width="3"/>`,
      );
    }
  }

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${pal.wall}"/><stop offset="1" stop-color="${pal.wall}" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fb6c8"/><stop offset="0.7" stop-color="#dfe5e6"/><stop offset="1" stop-color="#8fa08e"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${pal.floor}"/><stop offset="1" stop-color="${pal.floor}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${pal.open ? 'url(#sky)' : '#f3f1ec'}"/>
  <polygon points="0,${H / 2} ${ceilPts.join(' ')} ${W},${H / 2} ${W},${H} 0,${H}" fill="url(#wall)"/>
  <polygon points="${floorPts.join(' ')} ${W},${H} 0,${H}" fill="url(#floor)"/>
  ${corners.join('\n  ')}
  ${shapes.join('\n  ')}
  <text x="${W * 0.25}" y="${H * 0.78}" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="#1c1b19" fill-opacity="0.55">${esc(name)}</text>
  <text x="${W * 0.25}" y="${H * 0.78 + 50}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" letter-spacing="6" fill="#1c1b19" fill-opacity="0.45">360° ILUSTRATIVO</text>
</svg>
`;
  return { svg, lookYaw };
}

const slugs = only ? [only] : readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
let written = 0;
for (const slug of slugs) {
  const dir = path.join(ROOT, slug);
  const file = path.join(dir, 'hotel.json');
  const hotel = JSON.parse(readFileSync(file, 'utf8'));
  for (const u of hotel.units) {
    // las copias de una unidad tipo (sameAs) comparten los panoramas de su plantilla
    if ('sameAs' in u) continue;
    const plan = parsePlan(readFileSync(path.join(dir, u.plan), 'utf8'));
    const centers = Object.fromEntries(plan.spaces.map((s) => [s.id, labelPoint(s.pts)]));
    for (const s of u.spaces) {
      const geo = plan.spaces.find((p) => p.id === s.id);
      if (!geo) continue;
      // el pano se comparte entre unidades con el mismo plano (mismo archivo)
      const base = path.basename(u.plan, '.svg');
      const src = `media/panos/${base}/${s.id}-360.svg`;
      const out = path.join(dir, src);
      const { svg, lookYaw } = pano({ name: s.name, type: s.type, pts: geo.pts, openings: plan.openings });
      if (force || !existsSync(out)) {
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, svg);
        written++;
      }
      const here = centers[s.id];
      const hotspots = u.spaces
        .filter((o) => o.id !== s.id && centers[o.id])
        .map((o) => {
          const [tx, tz] = centers[o.id];
          return {
            id: `a-${o.id}`,
            yaw: +Math.atan2(tz - here[1], tx - here[0]).toFixed(4),
            pitch: -0.12,
            label: o.name,
            target: o.id,
          };
        });
      const media = {
        id: `pano-${u.id}-${s.id}`,
        kind: 'pano360',
        src,
        alt: `${s.name} en 360° (imagen ilustrativa)`,
        fidelity: 'ilustrativa',
        width: W,
        height: H,
        yaw: +lookYaw.toFixed(4),
        hotspots,
      };
      const i = s.media.findIndex((m) => m.kind === 'pano360');
      if (i >= 0) s.media[i] = media;
      else s.media.unshift(media);
    }
  }
  writeFileSync(file, JSON.stringify(hotel, null, 2) + '\n');
}
console.log(`panoramas: ${written} escritos; hotel.json actualizado`);
