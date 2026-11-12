'use client';

import { useSyncExternalStore } from 'react';

/**
 * Modo de la página de Antesala (D-063):
 * - "cine": edificio 3D y la película con video (scroll mueve el video).
 * - "ligero": sin three.js ni video; el recorrido se dibuja como un plano
 *   sobre papel y la película pasa con fotos y trazos.
 * Se elige solo con la conexión y el equipo (ahorro de datos, 2G/3G, poca
 * memoria) y la persona lo puede cambiar; su elección se recuerda.
 */
export type Modo = 'cine' | 'ligero';

const KEY = 'antesala:modo';
const listeners = new Set<() => void>();
let current: Modo | null = null;

function detect(): Modo {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'cine' || saved === 'ligero') return saved;
  } catch {
    /* sin almacenamiento */
  }
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };
  const c = nav.connection;
  if (c?.saveData) return 'ligero';
  if (c?.effectiveType && /(^|-)(2g|3g)$/.test(c.effectiveType)) return 'ligero';
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return 'ligero';
  if (window.matchMedia('(prefers-reduced-data: reduce)').matches) return 'ligero';
  return 'cine';
}

function get(): Modo | null {
  if (typeof window === 'undefined') return null;
  if (current === null) current = detect();
  return current;
}

export function setModo(m: Modo) {
  current = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
}

/** null en el servidor y antes de decidir: no se carga nada pesado todavía. */
export function useModo(): Modo | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get,
    () => null,
  );
}
