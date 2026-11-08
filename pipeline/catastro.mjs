#!/usr/bin/env node
/**
 * pnpm catastro <slug> --via "CL 158" --placa "93A 37" [--radio 260] [--torre <CONCODIGO>]
 *
 * Edificio real desde el catastro de Bogotá (D-056), con datos abiertos:
 * - placa domiciliaria → lote; construcciones del lote → huella y pisos del edificio;
 * - construcciones alrededor (con sus pisos) → contexto; vías de OpenStreetMap → calles.
 * Todo pasa a metros locales, girado para que la fachada sobre la vía mire a +z.
 * Escribe content/hotels/<slug>/context.json (vecinos y calles, se carga aparte) y
 * actualiza site.building y site.context en hotel.json.
 *
 * Fuentes: UAECD (Catastro Bogotá, datos abiertos) y © colaboradores de OpenStreetMap (ODbL).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const slug = args[0];
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const via = opt('via');
const placa = opt('placa');
const radio = Number(opt('radio', 260));
const torre = opt('torre');
if (!slug || !via || !placa) {
  console.error('Uso: pnpm catastro <slug> --via "CL 158" --placa "93A 37" [--radio 260] [--torre CONCODIGO]');
  process.exit(1);
}

const UA = { 'User-Agent': 'Antesala/0.1 (pipeline catastro)' };
const SVC = 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/catastro';
const q = async (layer, params) => {
  // el servicio entrega por páginas (máximo de registros por consulta)
  const out = [];
  for (let offset = 0; ; ) {
    const url = `${SVC}/${layer}/MapServer/0/query?${new URLSearchParams({ f: 'json', outSR: '4326', resultOffset: String(offset), resultRecordCount: '1000', ...params })}`;
    const j = await (await fetch(url, { headers: UA })).json();
    if (j.error) throw new Error(`${layer}: ${JSON.stringify(j.error)}`);
    out.push(...(j.features ?? []));
    if (!j.exceededTransferLimit || !j.features?.length) return out;
    offset += j.features.length;
  }
};

// 1) placa → lote y punto de la dirección
const plates = await q('placadomiciliaria', {
  where: `PDONVIAL = '${via}' AND PDOTEXTO = '${placa}'`,
  outFields: 'PDOTEXTO,PDONVIAL,PDOCLOTE',
  returnGeometry: 'true',
});
if (!plates.length) throw new Error(`No hay placa ${via} # ${placa}`);
const lote = plates[0].attributes.PDOCLOTE;
const [lon0, lat0] = [plates[0].geometry.x, plates[0].geometry.y];
console.log(`Placa ${via} # ${placa} → lote ${lote} (${lat0.toFixed(5)}, ${lon0.toFixed(5)})`);

// metros locales: x al oriente, z al sur
const MX = 111320 * Math.cos((lat0 * Math.PI) / 180);
const MZ = 110574;
const toM = ([lon, lat]) => [(lon - lon0) * MX, (lat0 - lat) * MZ];

// 2) construcciones alrededor (incluye las del lote)
const all = await q('construccion', {
  geometry: `${lon0},${lat0}`,
  geometryType: 'esriGeometryPoint',
  inSR: '4326',
  spatialRel: 'esriSpatialRelIntersects',
  distance: String(radio),
  units: 'esriSRUnit_Meter',
  outFields: 'CONCODIGO,CONNPISOS,CONNSOTANO,LOTECODIGO',
  returnGeometry: 'true',
});
const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};
const polys = all
  .map((f) => {
    let ring = f.geometry.rings[0].map(toM);
    if (ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]) ring = ring.slice(0, -1);
    return { code: f.attributes.CONCODIGO, lote: f.attributes.LOTECODIGO, floors: f.attributes.CONNPISOS ?? 1, ring };
  })
  .filter((p) => p.ring.length >= 3 && Math.abs(area(p.ring)) >= 12 && p.floors >= 1);

// 3) el edificio: la construcción del lote más cercana a la placa (o la pedida)
const centroid = (r) => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
const own = polys.filter((p) => p.lote === lote).sort((a, b) => Math.abs(area(b.ring)) - Math.abs(area(a.ring)));
const main = torre
  ? own.find((p) => p.code === torre)
  : [...own.filter((p) => Math.abs(area(p.ring)) > 100)].sort((a, b) => Math.hypot(...centroid(a.ring)) - Math.hypot(...centroid(b.ring)))[0];
if (!main) throw new Error('No se encontró la construcción principal en el lote');
console.log(`Edificio: ${main.code}, ${main.floors} pisos, ${Math.abs(area(main.ring)).toFixed(0)} m² (lote con ${own.length} construcciones)`);

// 4) giro: el borde largo del edificio más cercano a la placa queda mirando a +z (la calle)
const edges = main.ring.map((a, i) => {
  const b = main.ring[(i + 1) % main.ring.length];
  return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
});
const [mcx, mcz] = centroid(main.ring);
const front = edges
  .filter((e) => e.len >= 6)
  .sort((e1, e2) => Math.hypot(...e1.mid) - Math.hypot(...e2.mid))[0];
// normal hacia afuera del borde frontal
let nx = front.b[1] - front.a[1];
let nz = -(front.b[0] - front.a[0]);
if (nx * (front.mid[0] - mcx) + nz * (front.mid[1] - mcz) < 0) [nx, nz] = [-nx, -nz];
const theta = Math.atan2(nx, nz); // girar -theta lleva la normal a +z
const rot = ([x, z]) => {
  const c = Math.cos(-theta);
  const s = Math.sin(-theta);
  return [x * c + z * s, -x * s + z * c];
};

// simplificación (Douglas-Peucker) y ortogonalización suave de la huella principal
function simplify(pts, tol) {
  if (pts.length <= 4) return pts;
  // polígono cerrado: se parte en el vértice más lejano al primero (DP necesita extremos distintos)
  let far = 1;
  for (let k = 1; k < pts.length; k++) {
    if (Math.hypot(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]) > Math.hypot(pts[far][0] - pts[0][0], pts[far][1] - pts[0][1])) far = k;
  }
  const closed = [...pts, pts[0]];
  const keep = new Array(closed.length).fill(false);
  keep[0] = keep[far] = keep[closed.length - 1] = true;
  const dp = (i, j) => {
    let max = 0;
    let idx = -1;
    const [ax, ay] = closed[i];
    const [bx, by] = closed[j];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((bx - ax) * (ay - closed[k][1]) - (ax - closed[k][0]) * (by - ay)) / L;
      if (d > max) [max, idx] = [d, k];
    }
    if (max > tol) {
      keep[idx] = true;
      dp(i, idx);
      dp(idx, j);
    }
  };
  dp(0, far);
  dp(far, closed.length - 1);
  return closed.filter((_, i) => keep[i]).slice(0, -1);
}
/** Lleva a ejes los bordes casi horizontales/verticales (planos y fachadas limpias). */
function orthogonalize(pts, maxDeg = 12) {
  const out = pts.map((p) => [...p]);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < out.length; i++) {
      const a = out[i];
      const b = out[(i + 1) % out.length];
      const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      const m = ((ang % 90) + 90) % 90;
      if (m < maxDeg || m > 90 - maxDeg) {
        const horizontal = Math.abs(Math.cos((ang * Math.PI) / 180)) > 0.7;
        if (horizontal) {
          const y = (a[1] + b[1]) / 2;
          a[1] = b[1] = y;
        } else {
          const x = (a[0] + b[0]) / 2;
          a[0] = b[0] = x;
        }
      }
    }
  }
  // quita vértices repetidos o colineales
  return simplify(out.filter((p, i) => Math.hypot(p[0] - out[(i + 1) % out.length][0], p[1] - out[(i + 1) % out.length][1]) > 0.05), 0.05);
}

const r1 = (n) => Math.round(n * 10) / 10;
let footprint = orthogonalize(simplify(main.ring.map(rot), 0.5));
// origen en la esquina mínima de la huella (como el resto de hoteles)
const minX = Math.min(...footprint.map((p) => p[0]));
const minZ = Math.min(...footprint.map((p) => p[1]));
const shift = ([x, z]) => [r1(x - minX), r1(z - minZ)];
footprint = footprint.map(shift);
if (area(footprint) < 0) footprint.reverse();

const local = (ring) => ring.map(rot).map(shift);
const blocks = polys
  .filter((p) => p.code !== main.code)
  .map((p) => ({
    floors: p.floors,
    sameLot: p.lote === lote || undefined,
    footprint: simplify(local(p.ring), 0.35).map(([x, z]) => [r1(x), r1(z)]),
  }))
  .filter((b) => b.footprint.length >= 3);

// 5) calles de OpenStreetMap
const bbox = (() => {
  const d = radio / 111320;
  return [lat0 - d, lon0 - d / Math.cos((lat0 * Math.PI) / 180), lat0 + d, lon0 + d / Math.cos((lat0 * Math.PI) / 180)];
})();
const overpass = `[out:json][timeout:60];way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|service|trunk)$"](${bbox.join(',')});out tags geom;`;
let streets = [];
try {
  let j = null;
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter']) {
    try {
      const r = await fetch(host, {
        method: 'POST',
        headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpass)}`,
        signal: AbortSignal.timeout(90_000),
      });
      if (r.ok) {
        j = await r.json();
        break;
      }
    } catch {
      /* siguiente servidor */
    }
    await new Promise((res) => setTimeout(res, 4000));
  }
  if (!j) throw new Error('Overpass no respondió');
  const WIDTH = { trunk: 16, primary: 14, secondary: 11, tertiary: 9, residential: 7, unclassified: 7, living_street: 6, service: 4.5 };
  streets = j.elements
    .filter((e) => e.geometry?.length >= 2)
    .map((e) => ({
      name: e.tags.name,
      width: WIDTH[e.tags.highway] ?? 7,
      points: e.geometry.map((g) => local([toM([g.lon, g.lat])])[0]).map(([x, z]) => [r1(x), r1(z)]),
    }));
} catch (e) {
  console.warn('Sin calles de OpenStreetMap:', e.message);
}

const dir = path.join(process.cwd(), 'content', 'hotels', slug);
const context = {
  source: `Catastro Bogotá (UAECD, datos abiertos) · lote ${lote} · © colaboradores de OpenStreetMap`,
  fetchedAt: new Date().toISOString().slice(0, 10),
  blocks,
  streets,
};
writeFileSync(path.join(dir, 'media', 'context.json'), JSON.stringify(context));
const file = path.join(dir, 'hotel.json');
const hotel = JSON.parse(readFileSync(file, 'utf8'));
hotel.site.building = { ...hotel.site.building, footprint, floors: main.floors, floorHeightM: hotel.site.building?.floorHeightM ?? 2.7 };
hotel.site.context = 'media/context.json';
writeFileSync(file, `${JSON.stringify(hotel, null, 2)}\n`);

const xs = footprint.map((p) => p[0]);
const zs = footprint.map((p) => p[1]);
console.log(`Huella: ${footprint.length} vértices, ${Math.max(...xs).toFixed(1)} × ${Math.max(...zs).toFixed(1)} m, ${Math.abs(area(footprint)).toFixed(0)} m²`);
console.log(JSON.stringify(footprint));
console.log(`Contexto: ${blocks.length} construcciones, ${streets.length} vías → ${path.join('content/hotels', slug, 'media', 'context.json')}`);
