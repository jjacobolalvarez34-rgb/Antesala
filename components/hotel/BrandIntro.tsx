'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { can3d, useTour } from '@/lib/store';

/**
 * Entrada de marca como telón de carga del edificio (D-043, D-052): mientras
 * carga el 3D, el nombre del hotel sube letra por letra sobre la niebla; cuando
 * la escena está lista, la cortina se abre sobre el edificio. Así nunca se ve
 * la lista de respaldo "a medio cargar".
 *
 * - Solo en etapas con 3D (edificio, piso, unidad) y si el 3D se va a mostrar:
 *   sin WebGL, con la lista elegida o mientras se pregunta "¿quieres 3D?", no tapa.
 * - Animada la primera vez de la sesión; después, el nombre quieto (el script en
 *   línea marca <html data-intro="seen"> antes de pintar).
 * - Dura al menos lo que la animación; como máximo 20 s aunque el 3D no llegue.
 * - Solo CSS (sin GSAP en el JS inicial). "Saltar" deja ver la lista de inmediato.
 */
const KEY = 'antesala:intro';
const MIN_ANIMATED_MS = 2300;
const MIN_STATIC_MS = 300;
const MAX_MS = 20_000;
const LEAVE_MS = 750;

export function BrandIntro({ name, tagline, base }: { name: string; tagline: string; base: string }) {
  const pathname = usePathname();
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  const stage3d = /^\/(explorar|piso\/[^/]+|unidad\/[^/]+)(\/[^/]+)?\/?$/.test(rest);
  const tour = useTour();
  const blocked = tour.quality !== null && !can3d(tour);
  const [phase, setPhase] = useState<'cover' | 'leaving' | 'done'>('cover');
  const show = stage3d && phase !== 'done' && !blocked;

  // cuándo empezó a verse y si se anima (primera vez de la sesión)
  const shownAt = useRef<number | null>(null);
  const animated = useRef(true);

  useEffect(() => {
    if (!show || phase !== 'cover') return;
    if (shownAt.current === null) {
      shownAt.current = performance.now();
      animated.current = document.documentElement.dataset.intro !== 'seen';
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {
        /* sin almacenamiento: se anima cada vez */
      }
    }
    const elapsed = performance.now() - shownAt.current;
    const min = animated.current ? MIN_ANIMATED_MS : MIN_STATIC_MS;
    const wait = tour.sceneReady ? Math.max(0, min - elapsed) : Math.max(0, MAX_MS - elapsed);
    const t = window.setTimeout(() => setPhase('leaving'), wait);
    return () => window.clearTimeout(t);
  }, [show, phase, tour.sceneReady]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = window.setTimeout(() => setPhase('done'), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (!show) return null;

  return (
    <>
      <script
        // se ejecuta al parsear el HTML, antes de pintar
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('${KEY}'))document.documentElement.dataset.intro='seen'}catch(e){}`,
        }}
      />
      <div
        role="status"
        aria-label={`${name}: preparando el edificio`}
        className={`brand-intro pointer-events-auto fixed inset-0 z-50 grid place-items-center overflow-hidden bg-ink text-bone ${phase === 'leaving' ? 'brand-intro-leave' : ''}`}
      >
        <div aria-hidden className="brand-intro-fog" />
        <div className="relative text-center">
          <p className="brand-intro-name font-display text-[3.75rem] leading-none tracking-tight md:text-8xl" aria-hidden>
            {name.split('').map((ch, i) =>
              ch === ' ' ? (
                <span key={i} className="w-[0.26em]" />
              ) : (
                <span key={i} style={{ animationDelay: `${0.25 + i * 0.06}s` }}>
                  {ch}
                </span>
              ),
            )}
          </p>
          <p className="brand-intro-tagline mt-4 font-display text-xl text-bone/70 italic md:text-2xl">{tagline}</p>
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-[calc(6.5rem+var(--safe-bottom))] flex flex-col items-center gap-3">
          <span className="brand-intro-progress block h-px w-28 overflow-hidden bg-bone/15" />
          <span className="text-xs tracking-[0.18em] text-bone/55 uppercase">Preparando el edificio</span>
        </div>
        <button
          type="button"
          onClick={() => setPhase('leaving')}
          className="absolute right-5 bottom-[calc(1.5rem+var(--safe-bottom))] inline-flex min-h-11 items-center rounded-full border border-bone/25 px-5 text-sm text-bone/85 transition-colors hover:bg-bone/10"
        >
          Saltar
        </button>
      </div>
    </>
  );
}
