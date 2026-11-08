import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { listHotelSlugs } from '@/lib/content';

/**
 * Sirve los medios livianos de content/hotels/<slug>/{media,plans} durante la
 * demo. Se genera estáticamente en el build; en producción con R2 se usa
 * NEXT_PUBLIC_ASSETS_BASE_URL y esta ruta deja de usarse (ver lib/media.ts).
 */

export const dynamic = 'force-static';
export const dynamicParams = false;

const CONTENT = path.join(process.cwd(), 'content', 'hotels');
const SERVED_DIRS = ['media', 'plans'];
const TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  // contexto real del edificio (media/context.json, D-056)
  '.json': 'application/json',
};

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return files.flat();
}

export async function generateStaticParams() {
  const params: { hotel: string; path: string[] }[] = [];
  for (const hotel of await listHotelSlugs()) {
    for (const sub of SERVED_DIRS) {
      const base = path.join(CONTENT, hotel);
      for (const file of await walk(path.join(base, sub))) {
        if (TYPES[path.extname(file).toLowerCase()]) {
          params.push({ hotel, path: path.relative(base, file).split(path.sep) });
        }
      }
    }
  }
  return params;
}

export async function GET(_req: Request, ctx: RouteContext<'/demo-assets/[hotel]/[...path]'>) {
  const { hotel, path: parts } = await ctx.params;
  const type = TYPES[path.extname(parts.at(-1) ?? '').toLowerCase()];
  const base = path.join(CONTENT, hotel);
  const file = path.join(base, ...parts);
  if (!type || !SERVED_DIRS.includes(parts[0] ?? '') || !file.startsWith(base + path.sep)) {
    return new Response('No encontrado', { status: 404 });
  }
  const body = await readFile(file).catch(() => null);
  if (!body) return new Response('No encontrado', { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  });
}
