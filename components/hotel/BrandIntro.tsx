'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Entrada de marca (bloque 7, D-043): el nombre del hotel aparece letra por
 * letra sobre un fondo con niebla en movimiento, y la cortina se abre. Solo
 * CSS (sin GSAP en el JS inicial), una vez por sesión, con botón "Saltar".
 * Vive en el layout (encima de la barra de reserva) y solo aparece si se
 * llega por la portada del hotel.
 * Un script en línea marca <html data-intro="seen"> antes de pintar si ya se
 * vio, y el CSS la oculta: sin parpadeo. Con movimiento reducido, fundido corto.
 */
const KEY = 'antesala:intro';
const DURATION_MS = 2900;
const LEAVE_MS = 750;

export function BrandIntro({ name, tagline, home }: { name: string; tagline: string; home: string }) {
  const onHome = usePathname() === home;
  const [state, setState] = useState<'playing' | 'leaving' | 'done'>(onHome ? 'playing' : 'done');

  useEffect(() => {
    if (state === 'done') return;
    if (document.documentElement.dataset.intro === 'seen') {
      const t = window.setTimeout(() => setState('done'), 0);
      return () => window.clearTimeout(t);
    }
    sessionStorage.setItem(KEY, '1');
    const leave = window.setTimeout(() => setState('leaving'), DURATION_MS);
    return () => window.clearTimeout(leave);
    // solo al montar: la entrada no se repite al navegar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== 'leaving') return;
    const t = window.setTimeout(() => setState('done'), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [state]);

  if (state === 'done') return null;

  return (
    <>
      <script
        // se ejecuta al parsear el HTML, antes de pintar
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('${KEY}'))document.documentElement.dataset.intro='seen'}catch(e){}`,
        }}
      />
      <div
        role="presentation"
        className={`brand-intro pointer-events-auto fixed inset-0 z-50 grid place-items-center overflow-hidden bg-ink text-bone ${state === 'leaving' ? 'brand-intro-leave' : ''}`}
      >
        <div aria-hidden className="brand-intro-fog" />
        <div className="relative text-center">
          <p className="brand-intro-name font-display text-[3.75rem] leading-none tracking-tight md:text-8xl" aria-label={name}>
            {name.split('').map((ch, i) =>
              ch === ' ' ? (
                <span key={i} aria-hidden className="w-[0.26em]" />
              ) : (
                <span key={i} aria-hidden style={{ animationDelay: `${0.25 + i * 0.06}s` }}>
                  {ch}
                </span>
              ),
            )}
          </p>
          <p className="brand-intro-tagline mt-4 font-display text-xl text-bone/70 italic md:text-2xl">{tagline}</p>
        </div>
        <button
          type="button"
          onClick={() => setState('leaving')}
          className="absolute right-5 bottom-[calc(1.5rem+var(--safe-bottom))] inline-flex min-h-11 items-center rounded-full border border-bone/25 px-5 text-sm text-bone/85 transition-colors hover:bg-bone/10"
        >
          Saltar
        </button>
      </div>
    </>
  );
}
