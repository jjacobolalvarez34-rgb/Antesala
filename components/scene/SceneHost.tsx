'use client';

import { useEffect, type CSSProperties } from 'react';
import { create } from 'zustand';

import { LangProvider } from '@/components/i18n/Lang';
import type { Lang } from '@/lib/i18n';

import type { SceneDataWire } from './Scene';
import { SceneLayer } from './SceneLayer';
import type { TerrainDataWire } from './terrain/types';

/*
 * El 3D vive en el layout raíz, compartido por /h/... y /en/h/... (pedido de Jacobo, 2026-11-26:
 * "el traductor no está al instante en los recorridos"). Antes vivía en el layout del hotel, que es
 * otro en cada idioma: cambiar ES ⇄ EN desmontaba el lienzo y el 3D arrancaba de cero (WebGL,
 * sombreadores, texturas y el vuelo de entrada). Ahora el layout del hotel solo registra sus datos
 * (SceneRegister) y este anfitrión mantiene el mismo lienzo; al cambiar de idioma solo cambian los
 * textos.
 */

type Data = SceneDataWire | TerrainDataWire;
interface Entry {
  slug: string;
  lang: Lang;
  data: Data;
  style: CSSProperties;
}

const useSceneHost = create<{ entry: Entry | null; set: (e: Entry | null) => void }>((set) => ({
  entry: null,
  set: (entry) => set({ entry }),
}));

/**
 * Conserva los valores que no cambiaron (comparados por contenido): al traducir, el edificio, las
 * plantas y los colores siguen siendo los mismos objetos y la escena no rehace nada pesado.
 */
function stabilize(prev: Data | undefined, next: Data): Data {
  if (!prev) return next;
  const out: Record<string, unknown> = {};
  const p = prev as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(next)) out[k] = k in p && JSON.stringify(p[k]) === JSON.stringify(v) ? p[k] : v;
  return out as unknown as Data;
}

let clearTimer: number | undefined;

/** Desde el layout del hotel: "este es mi 3D". Al salir del hotel (no al cambiar de idioma) se quita. */
export function SceneRegister({ slug, lang, data, style }: Entry) {
  useEffect(() => {
    window.clearTimeout(clearTimer);
    const { entry, set } = useSceneHost.getState();
    set({ slug, lang, style, data: entry?.slug === slug ? stabilize(entry.data, data) : data });
    // al cambiar de idioma, el layout viejo se desmonta y el nuevo se registra en el mismo paso:
    // se espera un momento antes de quitar el 3D para no perder el lienzo
    return () => {
      clearTimer = window.setTimeout(() => useSceneHost.getState().set(null), 1500);
    };
  }, [slug, lang, data, style]);
  return null;
}

/** En el layout raíz. */
export function SceneHost() {
  const entry = useSceneHost((s) => s.entry);
  if (!entry) return null;
  return (
    <LangProvider lang={entry.lang}>
      <div style={entry.style} className="contents">
        {/* la llave es el hotel, no el idioma: cambiar de idioma no remonta el 3D */}
        <SceneLayer key={entry.slug} data={entry.data} />
      </div>
    </LangProvider>
  );
}
