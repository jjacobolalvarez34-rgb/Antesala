/**
 * pnpm estado: arma docs/estado/Antesala-estado.pdf con docs/ESTADO.md y las
 * capturas de docs/estado/capturas/ (para pasarlo a la conversación de estrategia).
 * Las capturas se rehacen con .tmp/check/capturas.spec.ts (ver bitácora).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = process.cwd();
const MD = readFileSync(path.join(ROOT, 'docs/ESTADO.md'), 'utf8');
const SHOTS = path.join(ROOT, 'docs/estado/capturas');

const CAPTIONS = {
  '01-antesala-inicio': 'Página de Antesala: inicio del recorrido (edificio 3D en azul noche)',
  '02-antesala-plano': 'Recorrido, paso 4: el plano de la Suite 502, con sus espacios tocables',
  '03-antesala-espacios': 'Recorrido, paso 5: mosaico de los espacios (fotos de Higgsfield)',
  '04-antesala-reserva': 'Recorrido, paso 6: la reserva, con tarifa base y extra por piso alto',
  '05-antesala-demos': 'Demos: Niebla Alta (planta con libres y ocupadas), Akuare (alzado con vendidos), glamping próximamente',
  '06-antesala-precios': 'Precios: Esencial, Inmersivo (recomendado) y Premium, cada uno con "Ver ejemplo"',
  '07-niebla-portada': 'Niebla Alta: portada con la fachada fotográfica y puntos tocables',
  '08-niebla-edificio-3d': 'Niebla Alta: el edificio en 3D (de noche, según la hora)',
  '09-niebla-piso-abierto-luz': 'Piso abierto: luz cálida solo sobre la habitación bajo el mouse',
  '10-niebla-espacio-foto': 'Espacio: foto profesional que se puede mirar arrastrando',
  '11-niebla-planta-disponibilidad': 'Sin 3D: planta del piso con unidades libres (verde) y ocupadas (terracota)',
  '12-akuare-portada': 'Akuare: portada (render del 3D desde el catastro)',
  '13-akuare-planta-vendidos': 'Akuare: planta del piso con apartamentos disponibles y vendidos',
  '14-celular-antesala': 'Celular: página de Antesala',
  '15-celular-niebla-portada': 'Celular: portada de Niebla Alta',
};

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t) =>
  esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(https?:\/\/[^\s<)]+)/g, (u, _1, off, str) => (str.slice(Math.max(0, off - 6), off).includes('href') ? u : `<a href="${u}">${u}</a>`));

/** Markdown mínimo: títulos, párrafos, listas (con sangría), tablas, separadores. */
function md2html(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    if (/^---+$/.test(l.trim())) {
      out.push('<hr/>');
      i++;
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }
    if (l.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(
        `<table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      // lista con sangría: se arma con una pila de niveles
      const stack = [];
      let html = '';
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        const depth = Math.floor(m[1].length / 2);
        const tag = /\d/.test(m[2]) ? 'ol' : 'ul';
        while (stack.length > depth + 1) html += `</li></${stack.pop()}>`;
        if (stack.length === depth + 1) html += '</li>';
        while (stack.length < depth + 1) {
          html += `<${tag}>`;
          stack.push(tag);
        }
        html += `<li>${inline(m[3])}`;
        i++;
      }
      while (stack.length) html += `</li></${stack.pop()}>`;
      out.push(html);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||\s*([-*]|\d+\.)\s|---)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

const shots = await Promise.all(
  readdirSync(SHOTS)
    .filter((f) => /\.(png|jpg)$/.test(f))
    .sort()
    .map(async (f) => {
      const buf = await sharp(path.join(SHOTS, f)).resize({ width: 1366, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
      const key = f.replace(/\.(png|jpg)$/, '');
      const phone = key.includes('celular');
      return `<figure class="${phone ? 'phone' : ''}"><img src="data:image/jpeg;base64,${buf.toString('base64')}"/><figcaption>${esc(CAPTIONS[key] ?? key)}</figcaption></figure>`;
    }),
);

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Antesala — estado</title><style>
@page { size: A4; margin: 16mm 14mm; }
body { font: 10.5pt/1.5 'Segoe UI', Arial, sans-serif; color: #1c1b19; }
h1 { font: 600 22pt/1.2 Georgia, serif; color: #111b33; margin: 0 0 6pt; }
h2 { font: 600 14pt/1.3 Georgia, serif; color: #111b33; margin: 16pt 0 6pt; border-bottom: 1px solid #d2b88c; padding-bottom: 3pt; }
h3 { font-size: 11.5pt; margin: 12pt 0 4pt; }
p, li { margin: 3pt 0; }
ul, ol { padding-left: 16pt; margin: 4pt 0; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9pt; page-break-inside: avoid; }
th, td { border: 1px solid #ddd5c8; padding: 4pt 5pt; text-align: left; vertical-align: top; }
th { background: #f2e8d6; }
code { font: 9pt Consolas, monospace; background: #f4f1ea; padding: 0 3pt; border-radius: 2px; }
hr { border: 0; border-top: 1px solid #e5ded2; margin: 10pt 0; }
a { color: #7d5f3b; }
.shots { page-break-before: always; }
figure { margin: 0 0 12pt; page-break-inside: avoid; }
figure img { width: 100%; border: 1px solid #ddd5c8; border-radius: 3px; }
figure.phone { display: inline-block; width: 46%; margin-right: 3%; vertical-align: top; }
figcaption { font-size: 9pt; color: #6b655c; margin-top: 3pt; }
</style></head><body>
${md2html(MD)}
<div class="shots"><h2>Capturas de la web (${new Date().toISOString().slice(0, 10)})</h2>${shots.join('\n')}</div>
</body></html>`;

writeFileSync(path.join(ROOT, 'docs/estado/Antesala-estado.html'), html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({ path: path.join(ROOT, 'docs/estado/Antesala-estado.pdf'), format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' } });
await browser.close();
console.log('docs/estado/Antesala-estado.pdf');
