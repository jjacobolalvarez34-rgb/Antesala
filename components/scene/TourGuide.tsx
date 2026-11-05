'use client';

import { Hand, MousePointerClick, Move3d, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Guía del recorrido (D-048): la primera vez en el edificio, una tarjeta con
 * los tres pasos; después, una pista corta por pantalla, en el momento en que
 * hace falta. Cada una se ve una vez por sesión y se va al interactuar.
 */
export type GuideStep = 'explorar' | 'piso' | 'unidad' | 'espacio' | 'mirar';

const KEY = (s: GuideStep) => `antesala:guia:${s}`;
const HINT_MS = 6500;

function useTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return touch;
}

/** Espera a que la cámara termine de moverse (html[data-camera="idle"]). */
function whenIdle(cb: () => void) {
  const html = document.documentElement;
  if (html.dataset.camera !== 'moving') {
    const t = window.setTimeout(cb, 0);
    return () => window.clearTimeout(t);
  }
  const obs = new MutationObserver(() => {
    if (html.dataset.camera !== 'moving') {
      obs.disconnect();
      cb();
    }
  });
  obs.observe(html, { attributes: true, attributeFilter: ['data-camera'] });
  return () => obs.disconnect();
}

export function TourGuide({ step, active }: { step: GuideStep | null; active: boolean }) {
  const touch = useTouch();
  const [shown, setShown] = useState<GuideStep | null>(null);

  useEffect(() => {
    if (!step || !active) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY(step)) !== null;
    } catch {
      seen = true;
    }
    if (seen) return;
    let timer = 0;
    const stop = whenIdle(() => {
      timer = window.setTimeout(() => {
        try {
          sessionStorage.setItem(KEY(step), '1');
        } catch {
          /* sin almacenamiento: se muestra igual */
        }
        setShown(step);
      }, 500);
    });
    return () => {
      stop();
      window.clearTimeout(timer);
      setShown(null);
    };
  }, [step, active]);

  // las pistas cortas se van solas o al primer gesto sobre la escena
  useEffect(() => {
    if (!shown) return;
    const hide = () => setShown(null);
    const canvas = document.querySelector('canvas');
    canvas?.addEventListener('pointerdown', hide);
    const t = shown === 'explorar' ? 0 : window.setTimeout(hide, HINT_MS);
    return () => {
      canvas?.removeEventListener('pointerdown', hide);
      window.clearTimeout(t);
    };
  }, [shown]);

  if (!shown) return null;
  // la capa 3D es su propio contexto de apilamiento (debajo del contenido): la guía va al body
  const portal = (node: ReactNode) => createPortal(node, document.body);
  const tap = touch ? 'Toca' : 'Haz clic en';
  const Icon = touch ? Hand : MousePointerClick;

  if (shown === 'explorar') {
    return portal(
      <div className="pointer-events-none fixed inset-x-3 top-[calc(var(--safe-top,0px)+6.25rem)] z-40 flex justify-center md:top-28">
        <section
          aria-labelledby="guia-titulo"
          className="glass-dark pointer-events-auto w-full max-w-sm animate-in rounded-3xl p-5 shadow-2xl duration-500 fade-in slide-in-from-top-2"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="guia-titulo" className="font-display text-subtitle leading-tight">
              Así se recorre el hotel
            </h2>
            <button
              type="button"
              onClick={() => setShown(null)}
              aria-label="Cerrar la guía"
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-bone/10"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <ol className="mt-3 flex flex-col gap-2.5 text-sm text-bone/85">
            {[`${tap} un piso del edificio.`, 'Elige tu habitación en la planta.', 'Recórrela por dentro y reserva.'].map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-on-dark text-xs font-semibold text-ink">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setShown(null)}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-bone px-4 text-sm font-medium text-ink transition-colors hover:bg-bone/85"
          >
            Empezar
          </button>
        </section>
      </div>,
    );
  }

  const text =
    shown === 'piso'
      ? `${tap} una habitación para entrar`
      : shown === 'unidad'
        ? `${tap} un espacio para verlo de cerca`
        : shown === 'espacio'
          ? 'Arrastra para girar la maqueta'
          : 'Arrastra para mirar alrededor';
  const HintIcon = shown === 'espacio' || shown === 'mirar' ? Move3d : Icon;

  return portal(
    <div
      role="status"
      className="pointer-events-none fixed inset-x-3 top-[calc(var(--safe-top,0px)+6.25rem)] z-40 flex justify-center md:top-28"
    >
      <p className="glass-dark flex animate-in items-center gap-2 rounded-full py-2 pr-4 pl-3 text-sm shadow-xl duration-500 fade-in slide-in-from-top-2">
        <span className="relative grid size-6 place-items-center">
          <span className="absolute size-6 animate-ping rounded-full bg-accent-on-dark/30 motion-reduce:hidden" />
          <HintIcon aria-hidden className="relative size-4 text-accent-on-dark" />
        </span>
        {text}
      </p>
    </div>,
  );
}
