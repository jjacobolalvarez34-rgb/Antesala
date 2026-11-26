import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { cache } from 'react';

import type { GuidedManifest } from './guided-types';

/**
 * Vista guiada (D-095): lo que dejó pipeline/guiada.spec.ts en content/hotels/<slug>/media/guiada/.
 * Sin manifest, el hotel no tiene vista guiada (y no se muestra el botón).
 */
/**
 * Versión de un archivo de la vista guiada (su fecha), para la URL: al recapturar, la imagen se
 * llama igual y el navegador mostraba la vieja de su caché (con otro tamaño: salía estirada).
 */
export async function fileVersion(slug: string, src: string): Promise<string> {
  const file = src.startsWith('/')
    ? path.join(process.cwd(), 'public', src)
    : path.join(process.cwd(), 'content', 'hotels', slug, src);
  try {
    return Math.floor((await stat(file)).mtimeMs / 1000).toString(36);
  } catch {
    return '0';
  }
}

export const loadGuided = cache(async (slug: string): Promise<GuidedManifest | null> => {
  try {
    const raw = await readFile(path.join(process.cwd(), 'content', 'hotels', slug, 'media', 'guiada', 'manifest.json'), 'utf8');
    const m = JSON.parse(raw) as GuidedManifest;
    // una orientación sirve solo si tiene la toma de los pisos
    return Object.values(m.orients).some((o) => o?.pisos && o.floors) ? m : null;
  } catch {
    return null;
  }
});
