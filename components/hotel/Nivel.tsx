'use client';

import { useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

/**
 * Nivel de la demo (D-072, D-075): Esencial (sin 3D: fotos y 360°), Inmersivo (3D
 * por código y renders) y Premium (3D realista horneado y fotos profesionales).
 * Se guarda en la sesión; `?nivel=` lo fija desde un enlace (los "Ver ejemplo"
 * de los precios). Por defecto, Premium.
 */
export type Nivel = 'esencial' | 'inmersivo' | 'premium';
const KEY = 'antesala:nivel';
const CALIDAD = 'antesala:calidad';
const NIVELES: Nivel[] = ['esencial', 'inmersivo', 'premium'];
const EVENT = 'antesala-nivel';

let applied = '';

function read(): Nivel {
  try {
    const q = new URLSearchParams(window.location.search).get('nivel');
    // el ?nivel= del enlace se aplica una vez por página: después manda el selector
    if (q && q !== applied && (NIVELES as string[]).includes(q)) {
      applied = q;
      sessionStorage.setItem(KEY, q);
      // llegar a Inmersivo o Premium desde un enlace devuelve el 3D si se había quitado en Esencial
      if (q !== 'esencial' && sessionStorage.getItem(CALIDAD) === 'lista' && !new URLSearchParams(window.location.search).get('calidad')) {
        sessionStorage.removeItem(CALIDAD);
      }
    }
    const v = sessionStorage.getItem(KEY);
    return v && (NIVELES as string[]).includes(v) ? (v as Nivel) : 'premium';
  } catch {
    return 'premium';
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useNivel(): Nivel {
  return useSyncExternalStore(subscribe, read, () => 'premium');
}

/** Cambia de nivel: Esencial va a la lista sin 3D; volver de Esencial recarga con el 3D. */
export function setNivel(n: Nivel, base: string) {
  const prev = read();
  try {
    sessionStorage.setItem(KEY, n);
    if (n === 'esencial') sessionStorage.setItem(CALIDAD, 'lista');
    else if (sessionStorage.getItem(CALIDAD) === 'lista') sessionStorage.removeItem(CALIDAD);
  } catch {
    /* sin almacenamiento */
  }
  if (n === 'esencial') {
    // recarga completa a propósito: el modo sin 3D se decide al arrancar el visor
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${base}/lista?nivel=esencial&calidad=lista`;
    return;
  }
  if (prev === 'esencial') {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${base}/explorar?nivel=${n}`;
    return;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has('nivel')) {
    url.searchParams.delete('nivel');
    history.replaceState(history.state, '', url);
  }
  window.dispatchEvent(new Event(EVENT));
}

const LABELS: Record<Nivel, string> = { esencial: 'Esencial', inmersivo: 'Inmersivo', premium: 'Premium' };

/** "Ver como: Esencial · Inmersivo · Premium" en la banda de demo. */
export function NivelSelector({ base, className }: { base: string; className?: string }) {
  const nivel = useNivel();
  return (
    <div role="group" aria-label="Ver la demo como" className={cn('flex items-center gap-1.5 text-xs', className)}>
      <span className="hidden text-bone/60 lg:inline">Ver como</span>
      <div className="flex rounded-full bg-bone/10 p-0.5">
        {NIVELES.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={nivel === n}
            onClick={() => setNivel(n, base)}
            className={cn(
              'min-h-7 rounded-full px-2.5 transition-colors',
              nivel === n ? 'bg-bone text-ink' : 'text-bone/80 hover:text-bone',
            )}
          >
            {LABELS[n]}
          </button>
        ))}
      </div>
    </div>
  );
}
