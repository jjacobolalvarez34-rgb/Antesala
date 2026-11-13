'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tema de la página de Antesala (D-079): claro (secciones en marfil) u oscuro (todo
 * en azul noche). Sin elección guardada sigue al sistema. Se aplica como
 * `data-tema` en <html> antes de pintar (TEMA_PREPAINT) para que no parpadee.
 */
export type Tema = 'claro' | 'oscuro';
const KEY = 'antesala:tema';
const listeners = new Set<() => void>();

/** Se pone en el <head> de la página: aplica el tema guardado o el del sistema antes de pintar. */
export const TEMA_PREPAINT = `try{var t=localStorage.getItem('${KEY}');if(t!=='claro'&&t!=='oscuro')t=matchMedia('(prefers-color-scheme: dark)').matches?'oscuro':'claro';document.documentElement.dataset.tema=t}catch(e){}`;

function get(): Tema {
  return document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro';
}

export function setTema(t: Tema) {
  document.documentElement.dataset.tema = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
}

export function useTema(): Tema | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get,
    () => null,
  );
}
