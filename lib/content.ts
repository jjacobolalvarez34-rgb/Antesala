import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { z } from 'zod';

import { facadesOf, windowsOn } from './building';
import { parsePlan, polygonAreaM2 } from './plan';
import type { Hotel, HotelTokens, PlanGeometry } from './types';

/**
 * Loader de contenido por hotel: content/hotels/<slug>/.
 * Valida con zod y comprueba la integridad referencial. Cualquier error hace
 * fallar el build (las páginas se generan estáticamente desde aquí).
 */

const CONTENT_DIR = path.join(process.cwd(), 'content', 'hotels');
const AREA_TOLERANCE = 0.15;

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id en minúsculas, números y guiones');
const relPath = z
  .string()
  .regex(/^(?!\/)(?!.*\.\.)[\w\-./]+$/, 'ruta relativa a la carpeta del hotel, sin ".."');
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color hexadecimal #RRGGBB');

const panoHotspot = z.object({
  id,
  yaw: z.number(),
  pitch: z.number(),
  label: z.string().min(1),
  target: id.optional(),
});

const media = z.object({
  id,
  kind: z.enum(['photo', 'pano360', 'splat', 'video', 'glb']),
  src: relPath,
  preview: relPath.optional(),
  alt: z.string().min(3, 'todo medio necesita un alt descriptivo'),
  fidelity: z.enum(['exacta', 'ilustrativa']),
  capturedAt: z.iso.datetime().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  hotspots: z.array(panoHotspot).optional(),
  yaw: z.number().optional(),
});

const space = z.object({
  id,
  name: z.string().min(1),
  type: z.enum(['dormitorio', 'bano', 'sala', 'cocina', 'comedor', 'balcon', 'terraza', 'estudio', 'vestier', 'otro']),
  areaM2: z.number().positive().optional(),
  description: z.string().optional(),
  features: z.array(z.string()),
  media: z.array(media),
});

const unit = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  categoryId: id,
  levelId: id,
  capacity: z.number().int().positive(),
  beds: z.string().min(1),
  areaM2: z.number().positive(),
  basePriceCOP: z.number().int().nonnegative().optional(),
  viewPremiumCOP: z.number().int().nonnegative().optional(),
  view: z.string().optional(),
  plan: relPath.regex(/^plans\/.+\.svg$/, 'el plano va en plans/*.svg'),
  exterior: z
    .array(
      z.object({
        facade: z.number().int().nonnegative(),
        windows: z.array(z.number().int().nonnegative()).min(1),
      }),
    )
    .optional(),
  spaces: z.array(space).min(1),
  featured: z.boolean().optional(),
});

const hotelSchema = z.object({
  slug: id,
  name: z.string().min(1),
  city: z.string().min(1),
  neighborhood: z.string().optional(),
  intro: z.string().optional(),
  locale: z.enum(['es', 'en']),
  contact: z.object({
    whatsapp: z.string().regex(/^\d{10,15}$/, 'WhatsApp en formato internacional, solo dígitos'),
    bookingUrl: z.url().optional(),
  }),
  site: z.object({
    kind: z.enum(['edificio', 'terreno']),
    building: z
      .object({
        footprint: z.array(z.tuple([z.number(), z.number()])).min(3),
        floors: z.number().int().positive(),
        floorHeightM: z.number().positive(),
        style: z.object({ cladding: z.enum(['ladrillo', 'estuco', 'concreto']) }).optional(),
      })
      .optional(),
    exterior: z.array(media),
    pois: z.array(
      z.object({
        id,
        name: z.string().min(1),
        levelId: id.optional(),
        description: z.string().optional(),
        position: z.tuple([z.number(), z.number(), z.number()]),
        media: z.array(media),
        viewpoints: z
          .array(z.object({ id, name: z.string().min(1), position: z.tuple([z.number(), z.number(), z.number()]), yaw: z.number() }))
          .optional(),
      }),
    ),
  }),
  levels: z
    .array(
      z.object({
        id,
        name: z.string().min(1),
        kind: z.enum(['piso', 'zona']),
        order: z.number(),
        plan: relPath.regex(/^plans\/.+\.svg$/, 'el plano va en plans/*.svg').optional(),
      }),
    )
    .min(1),
  categories: z.array(z.object({ id, name: z.string(), tagline: z.string(), highlights: z.array(z.string()) })).min(1),
  units: z.array(unit),
  isDemo: z.boolean(),
  info: z
    .object({
      address: z.string().optional(),
      nearby: z.array(z.object({ name: z.string().min(1), time: z.string().min(1) })).optional(),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      amenities: z.array(z.string().min(1)).optional(),
      policies: z.array(z.string().min(1)).optional(),
      faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).optional(),
    })
    .optional(),
}) satisfies z.ZodType<Hotel>;

const tokensSchema = z.object({
  brand: z.object({ name: z.string(), logo: relPath.optional(), tagline: z.string() }),
  color: z.object({ accent: hex, accentOnDark: hex.optional(), base: hex, stone: hex.optional(), ink: hex }),
  font: z.object({ display: z.enum(['Instrument Serif']), text: z.enum(['Inter']) }),
  voice: z.string(),
}) satisfies z.ZodType<HotelTokens>;

export interface HotelBundle {
  hotel: Hotel;
  tokens: HotelTokens;
  /** geometría parseada por ruta de plano (unit.plan) */
  plans: Record<string, PlanGeometry>;
}

function fail(slug: string, problems: string[]): never {
  throw new Error(`Contenido inválido en content/hotels/${slug}:\n  - ${problems.join('\n  - ')}`);
}

function formatZod(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file} → ${i.path.join('.') || '(raíz)'}: ${i.message}`);
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function exists(file: string): Promise<boolean> {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

/** Lo que una unidad copia puede cambiar de su tipo; el resto (plano, espacios, fotos) se hereda. */
const COPY_KEYS = ['id', 'name', 'levelId', 'exterior', 'view', 'viewPremiumCOP', 'basePriceCOP', 'featured'] as const;

/**
 * Unidades tipo (D-047): `{ "sameAs": "201", "id": "202", ... }` hereda todo de la
 * unidad 201 y solo cambia número, piso, ventanas, vista y precio. Así un hotel
 * con 40 habitaciones iguales describe una y lista las demás.
 */
function expandCopies(raw: unknown, problems: string[]): unknown {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { units?: unknown }).units)) return raw;
  const units = (raw as { units: Record<string, unknown>[] }).units;
  const templates = new Map(units.filter((u) => !('sameAs' in u)).map((u) => [u.id as string, u]));
  return {
    ...raw,
    units: units.map((u) => {
      if (!('sameAs' in u)) return u;
      const template = templates.get(String(u.sameAs));
      if (!template) {
        problems.push(`unidad "${String(u.id)}" → sameAs "${String(u.sameAs)}" no es una unidad completa`);
        return u;
      }
      const extra = Object.keys(u).filter((k) => k !== 'sameAs' && !(COPY_KEYS as readonly string[]).includes(k));
      if (extra.length) problems.push(`unidad "${String(u.id)}" (copia) no puede cambiar: ${extra.join(', ')}`);
      const copy: Record<string, unknown> = { ...template, exterior: undefined, view: undefined, viewPremiumCOP: undefined, featured: undefined };
      for (const k of COPY_KEYS) if (k in u) copy[k] = u[k];
      return structuredClone(copy);
    }),
  };
}

async function loadBundle(slug: string): Promise<HotelBundle> {
  const dir = path.join(CONTENT_DIR, slug);

  const copyProblems: string[] = [];
  const hotelRaw = expandCopies(await readJson(path.join(dir, 'hotel.json')), copyProblems);
  if (copyProblems.length) fail(slug, copyProblems);
  const hotelParsed = hotelSchema.safeParse(hotelRaw);
  const tokensParsed = tokensSchema.safeParse(await readJson(path.join(dir, 'tokens.json')));
  const problems: string[] = [];
  if (!hotelParsed.success) problems.push(...formatZod('hotel.json', hotelParsed.error));
  if (!tokensParsed.success) problems.push(...formatZod('tokens.json', tokensParsed.error));
  if (!hotelParsed.success || !tokensParsed.success) fail(slug, problems);

  const hotel = hotelParsed.data;
  const tokens = tokensParsed.data;

  if (hotel.slug !== slug) problems.push(`hotel.json → slug "${hotel.slug}" no coincide con la carpeta "${slug}"`);

  const levelIds = new Set(hotel.levels.map((l) => l.id));
  const categoryIds = new Set(hotel.categories.map((c) => c.id));
  const unitIds = new Set<string>();
  const mediaSrcs = new Set<string>();

  const collect = (list: { src: string; preview?: string }[]) => {
    for (const m of list) {
      mediaSrcs.add(m.src);
      if (m.preview) mediaSrcs.add(m.preview);
    }
  };
  collect(hotel.site.exterior);

  for (const poi of hotel.site.pois) {
    if (poi.levelId && !levelIds.has(poi.levelId)) problems.push(`zona común "${poi.id}" → levelId "${poi.levelId}" no existe`);
    collect(poi.media);
  }

  const plans: Record<string, PlanGeometry> = {};
  const building = hotel.site.building;
  const facades = building ? facadesOf(building) : [];
  /** "piso|fachada|ventana" → unidad, para detectar ventanas compartidas */
  const taken = new Map<string, string>();

  for (const u of hotel.units) {
    if (unitIds.has(u.id)) problems.push(`unidad "${u.id}" repetida`);
    unitIds.add(u.id);
    if (!levelIds.has(u.levelId)) problems.push(`unidad "${u.id}" → levelId "${u.levelId}" no existe`);
    if (!categoryIds.has(u.categoryId)) problems.push(`unidad "${u.id}" → categoryId "${u.categoryId}" no existe`);

    const order = hotel.levels.find((l) => l.id === u.levelId)?.order;
    for (const ext of u.exterior ?? []) {
      const facade = facades[ext.facade];
      if (!building || !facade || order === undefined) {
        problems.push(`unidad "${u.id}" → exterior: la fachada ${ext.facade} no existe`);
        continue;
      }
      const count = windowsOn(building, facade.index, order);
      for (const w of ext.windows) {
        if (w >= count) {
          problems.push(`unidad "${u.id}" → exterior: ${facade.label} tiene ${count} ventanas en ese piso (índice ${w} no existe)`);
        }
        const key = `${u.levelId}|${ext.facade}|${w}`;
        const other = taken.get(key);
        if (other) problems.push(`unidad "${u.id}" → la ventana ${w} de ${facade.label} ya es de la unidad "${other}"`);
        taken.set(key, u.id);
      }
    }

    let geometry = plans[u.plan];
    if (!geometry) {
      try {
        geometry = parsePlan(await readFile(path.join(dir, u.plan), 'utf8'), u.plan);
        plans[u.plan] = geometry;
      } catch (e) {
        problems.push(`unidad "${u.id}" → ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }

    const polygonIds = new Map(geometry.spaces.map((s) => [s.id, s]));
    const spaceIds = new Set<string>();
    for (const s of u.spaces) {
      if (spaceIds.has(s.id)) problems.push(`unidad "${u.id}" → espacio "${s.id}" repetido`);
      spaceIds.add(s.id);
      const polygon = polygonIds.get(s.id);
      if (!polygon) {
        problems.push(`unidad "${u.id}" → el espacio "${s.id}" no tiene polígono en ${u.plan}`);
      } else if (s.areaM2) {
        const real = polygonAreaM2(polygon.points);
        if (Math.abs(real - s.areaM2) / real > AREA_TOLERANCE) {
          problems.push(
            `unidad "${u.id}" → espacio "${s.id}" declara ${s.areaM2} m² pero el polígono mide ${real.toFixed(1)} m²`,
          );
        }
      }
      for (const m of s.media) {
        for (const h of m.hotspots ?? []) {
          if (h.target && !u.spaces.some((x) => x.id === h.target)) {
            problems.push(`unidad "${u.id}" → hotspot "${h.id}" apunta a un espacio inexistente "${h.target}"`);
          }
        }
      }
      collect(s.media);
    }
    for (const pid of polygonIds.keys()) {
      if (!spaceIds.has(pid)) problems.push(`unidad "${u.id}" → ${u.plan} tiene el polígono "${pid}" sin espacio en hotel.json`);
    }
  }

  // plantas de piso: cada unidad del piso necesita su polígono (id = id de la unidad)
  for (const level of hotel.levels) {
    if (!level.plan) continue;
    let geometry = plans[level.plan];
    if (!geometry) {
      try {
        geometry = parsePlan(await readFile(path.join(dir, level.plan), 'utf8'), level.plan);
        plans[level.plan] = geometry;
      } catch (e) {
        problems.push(`piso "${level.id}" → ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }
    const ids = new Set(geometry.spaces.map((s) => s.id));
    for (const u of hotel.units.filter((x) => x.levelId === level.id)) {
      if (!ids.has(u.id)) problems.push(`piso "${level.id}" → ${level.plan} no tiene el polígono de la unidad "${u.id}"`);
    }
  }

  if (tokens.brand.logo) mediaSrcs.add(tokens.brand.logo);
  for (const src of mediaSrcs) {
    if (!(await exists(path.join(dir, src)))) problems.push(`falta el archivo de medio: ${src}`);
  }

  if (problems.length) fail(slug, problems);
  return { hotel, tokens, plans };
}

/** Slugs de todos los hotels con carpeta en content/hotels. */
export const listHotelSlugs = cache(async (): Promise<string[]> => {
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
});

/** Carga y valida un hotel. Devuelve null si la carpeta no existe. */
export const getHotelBundle = cache(async (slug: string): Promise<HotelBundle | null> => {
  const slugs = await listHotelSlugs();
  if (!slugs.includes(slug)) return null;
  return loadBundle(slug);
});
