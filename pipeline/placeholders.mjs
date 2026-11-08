#!/usr/bin/env node
/**
 * Genera placeholders SVG livianos para los medios de un hotel de demo.
 *
 *   node pipeline/placeholders.mjs [slug] [--force]
 *
 * Recorre content/hotels/<slug>/hotel.json y, por cada medio con `src` *.svg
 * dentro de media/ que no exista (o todos con --force), escribe una ilustración
 * de líneas con el nombre del espacio. Se reemplazan por renders en el bloque 5.
 * No usa imágenes de internet ni fuentes externas.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'content', 'hotels');
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));

const W = 1600;
const H = 1067;

const PALETTES = {
  dormitorio: ['#EEE8DD', '#CDBFAC'],
  sala: ['#EFE9DF', '#C8B9A3'],
  comedor: ['#EFE9DF', '#C8B9A3'],
  estudio: ['#EFE9DF', '#C8B9A3'],
  cocina: ['#ECE8E0', '#C3BBAC'],
  bano: ['#E9EBE7', '#BCC3BF'],
  vestier: ['#EEE8DD', '#CDBFAC'],
  balcon: ['#E3E7E4', '#A9B6B2'],
  terraza: ['#E3E7E4', '#A9B6B2'],
  poi: ['#ECE5D8', '#BCAD94'],
  otro: ['#ECE5D8', '#BCAD94'],
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cerros(y, amp) {
  const pts = [];
  for (let x = 0; x <= W; x += 80) {
    const h = Math.sin(x / 210) * amp + Math.sin(x / 97 + 1.3) * amp * 0.35;
    pts.push(`${x},${(y - Math.abs(h)).toFixed(0)}`);
  }
  return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
}

function drawing(variant, outdoor, ink, accent) {
  const stroke = (opacity = 0.28) => `fill="none" stroke="${ink}" stroke-opacity="${opacity}" stroke-width="2"`;
  const line = stroke();
  if (outdoor) {
    const base = `<path d="${cerros(560, 90)}" fill="${ink}" fill-opacity="0.10"/>
  <path d="${cerros(640, 60)}" fill="${ink}" fill-opacity="0.10"/>`;
    if (variant === 0)
      return `${base}
  <path d="M120 760 H1480 M120 760 V980 M1480 760 V980" ${line}/>
  <path d="M120 820 H1480" ${line} stroke-dasharray="2 18"/>`;
    if (variant === 1)
      return `${base}
  <circle cx="1180" cy="300" r="70" fill="${accent}" fill-opacity="0.22"/>
  <path d="M300 980 V700 Q300 640 360 640 H520 Q580 640 580 700 V980" ${line}/>`;
    return `${base}
  <circle cx="420" cy="250" r="90" fill="#fff" fill-opacity="0.45"/>`;
  }
  if (variant === 0)
    return `<rect x="560" y="300" width="480" height="400" ${line}/>
  <path d="M0 0 L560 300 M${W} 0 L1040 300 M0 ${H} L560 700 M${W} ${H} L1040 700" ${line}/>
  <rect x="680" y="380" width="240" height="190" fill="#fff" fill-opacity="0.35" stroke="${ink}" stroke-opacity="0.28" stroke-width="2"/>
  <path d="M800 380 V570" ${line}/>
  <rect x="600" y="600" width="400" height="70" fill="${accent}" fill-opacity="0.16"/>`;
  if (variant === 1)
    return `<path d="M520 ${H} V520 A280 280 0 0 1 1080 520 V${H}" ${line}/>
  <path d="M600 ${H} V540 A200 200 0 0 1 1000 540 V${H}" ${stroke(0.16)}/>
  <circle cx="800" cy="300" r="46" fill="${accent}" fill-opacity="0.28"/>
  <path d="M800 0 V254" ${line}/>`;
  return `<rect x="150" y="160" width="420" height="560" fill="#fff" fill-opacity="0.32" stroke="${ink}" stroke-opacity="0.28" stroke-width="2"/>
  <path d="M360 160 V720 M150 440 H570" ${line}/>
  <path d="M570 160 L1300 ${H} L620 ${H} L150 720 Z" fill="#fff" fill-opacity="0.22"/>
  <path d="M0 860 H${W}" ${line}/>`;
}

function svg({ title, subtitle, type, variant, ink, accent }) {
  const [c1, c2] = PALETTES[type] ?? PALETTES.otro;
  const outdoor = type === 'balcon' || type === 'terraza';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="f" cx="0.3" cy="0.25" r="0.8">
      <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#f)"/>
  ${drawing(variant, outdoor, ink, accent)}
  <text x="${W / 2}" y="${H - 150}" text-anchor="middle" font-family="'Instrument Serif', Georgia, 'Times New Roman', serif" font-size="76" fill="${ink}" fill-opacity="0.82">${esc(title)}</text>
  <text x="${W / 2}" y="${H - 96}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="28" letter-spacing="4" fill="${ink}" fill-opacity="0.55">${esc(subtitle.toUpperCase())}</text>
</svg>
`;
}

function jobsFor(hotel) {
  const jobs = [];
  const push = (list, title, subtitle, type) =>
    list.forEach((m, i) => jobs.push({ m, title, subtitle, type, variant: i % 3 }));
  push(hotel.site.exterior, hotel.name, hotel.city, 'otro');
  for (const p of hotel.site.pois) push(p.media, p.name, `${hotel.name} · zona común`, 'poi');
  for (const u of hotel.units) for (const s of u.spaces ?? []) push(s.media, s.name, u.name, s.type);
  return jobs;
}

const slugs = only ? [only] : readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
let written = 0;
let skipped = 0;
for (const slug of slugs) {
  const dir = path.join(ROOT, slug);
  const hotel = JSON.parse(readFileSync(path.join(dir, 'hotel.json'), 'utf8'));
  const tokensFile = path.join(dir, 'tokens.json');
  const tokens = existsSync(tokensFile) ? JSON.parse(readFileSync(tokensFile, 'utf8')) : null;
  const ink = tokens?.color?.ink ?? '#1C1B19';
  const accent = tokens?.color?.accent ?? '#7D5F3B';
  for (const job of jobsFor(hotel)) {
    if (!job.m.src.startsWith('media/') || !job.m.src.endsWith('.svg')) continue;
    const file = path.join(dir, job.m.src);
    if (existsSync(file) && !force) {
      skipped++;
      continue;
    }
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, svg({ ...job, ink, accent }));
    written++;
  }
}
console.log(`placeholders: ${written} escritos, ${skipped} ya existían`);
