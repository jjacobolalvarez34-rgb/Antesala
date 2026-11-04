import type { PlanFurniture, PlanGeometry, PlanOpening, PlanRect, PlanSpace } from './types';

/**
 * Parser mínimo de planos SVG con la convención de docs/CONTENIDO.md §4.
 * No es un parser de SVG general: exige geometría limpia (sin transform ni estilos)
 * y falla con un mensaje claro si el archivo se sale de la convención.
 */

const GROUPS = ['walls', 'spaces', 'openings', 'furniture'] as const;
type GroupId = (typeof GROUPS)[number];

export class PlanError extends Error {
  constructor(file: string, message: string) {
    super(`[plano ${file}] ${message}`);
    this.name = 'PlanError';
  }
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

function num(file: string, value: string | undefined, name: string): number {
  const n = Number(value);
  if (value === undefined || !Number.isFinite(n)) {
    throw new PlanError(file, `atributo numérico inválido o ausente: ${name}="${value ?? ''}"`);
  }
  return n;
}

function rect(file: string, a: Record<string, string>): PlanRect {
  return {
    x: num(file, a.x ?? '0', 'x'),
    y: num(file, a.y ?? '0', 'y'),
    width: num(file, a.width, 'width'),
    height: num(file, a.height, 'height'),
  };
}

function points(file: string, raw: string | undefined, id: string): [number, number][] {
  const nums = (raw ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < 6 || nums.length % 2 !== 0 || nums.some((n) => !Number.isFinite(n))) {
    throw new PlanError(file, `el polígono "${id}" tiene puntos inválidos`);
  }
  const pts: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) pts.push([nums[i]!, nums[i + 1]!]);
  return pts;
}

export function parsePlan(svg: string, file = 'plano.svg'): PlanGeometry {
  if (/\btransform\s*=/.test(svg)) throw new PlanError(file, 'no se permiten transformaciones (transform)');
  if (/\bstyle\s*=/.test(svg) || /<style[\s>]/.test(svg)) throw new PlanError(file, 'no se permiten estilos en línea');

  const root = svg.match(/<svg\b[^>]*>/);
  if (!root) throw new PlanError(file, 'no se encontró la etiqueta <svg>');
  const viewBox = attrs(root[0]).viewBox?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some((n) => !Number.isFinite(n))) {
    throw new PlanError(file, 'falta un viewBox válido (en centímetros)');
  }
  const [minX, minY, width, height] = viewBox as [number, number, number, number];
  if (minX !== 0 || minY !== 0) throw new PlanError(file, 'el viewBox debe empezar en 0 0');

  const bodies: Partial<Record<GroupId, string>> = {};
  for (const m of svg.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/g)) {
    const id = attrs(m[1]!).id as GroupId | undefined;
    if (m[2]!.includes('<g')) throw new PlanError(file, 'no se permiten grupos anidados');
    if (id && (GROUPS as readonly string[]).includes(id)) bodies[id] = m[2]!;
  }
  for (const required of ['walls', 'spaces', 'openings'] as const) {
    if (bodies[required] === undefined) throw new PlanError(file, `falta el grupo obligatorio <g id="${required}">`);
  }

  const elements = (body: string | undefined, tag: string) =>
    [...(body ?? '').matchAll(new RegExp(`<${tag}\\b([^>]*?)\\/?>`, 'g'))].map((m) => attrs(m[1]!));

  if (/<path\b/.test(bodies.walls!)) {
    throw new PlanError(file, 'las paredes con <path> aún no están soportadas; usa <rect>');
  }
  const walls = elements(bodies.walls, 'rect').map((a) => rect(file, a));

  const spaces: PlanSpace[] = elements(bodies.spaces, 'polygon').map((a) => {
    if (!a.id) throw new PlanError(file, 'hay un polígono de espacio sin id');
    return { id: a.id, points: points(file, a.points, a.id) };
  });
  const seen = new Set<string>();
  for (const s of spaces) {
    if (seen.has(s.id)) throw new PlanError(file, `id de espacio repetido: "${s.id}"`);
    seen.add(s.id);
  }

  const openings: PlanOpening[] = elements(bodies.openings, 'rect').map((a) => {
    const type = a['data-type'];
    if (type !== 'door' && type !== 'window') {
      throw new PlanError(file, `hueco con data-type inválido: "${type ?? ''}" (usa door o window)`);
    }
    return { ...rect(file, a), type };
  });

  const furniture: PlanFurniture[] = elements(bodies.furniture, 'rect').map((a) => ({
    ...rect(file, a),
    item: a['data-item'] ?? 'otro',
  }));

  return { width, height, walls, spaces, openings, furniture };
}

/** Área de un polígono en m² (los puntos están en cm). */
export function polygonAreaM2(pts: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2 / 10_000;
}

/** Centroide aproximado (promedio de vértices) para ubicar etiquetas. */
export function polygonLabelPoint(pts: [number, number][]): [number, number] {
  // Para polígonos en L el promedio de vértices puede caer fuera; usamos el
  // centro del rectángulo más grande del polígono descompuesto por bandas.
  const xs = [...new Set(pts.map((p) => p[0]))].sort((a, b) => a - b);
  const ys = [...new Set(pts.map((p) => p[1]))].sort((a, b) => a - b);
  let best: { area: number; cx: number; cy: number } | null = null;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i]! + xs[i + 1]!) / 2;
      const cy = (ys[j]! + ys[j + 1]!) / 2;
      if (!pointInPolygon([cx, cy], pts)) continue;
      const area = (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!);
      if (!best || area > best.area) best = { area, cx, cy };
    }
  }
  if (best) return [best.cx, best.cy];
  const n = pts.length;
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
}

function pointInPolygon([x, y]: [number, number], pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
