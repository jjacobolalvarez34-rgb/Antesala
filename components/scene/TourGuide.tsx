'use client';

import { Hand, MousePointerClick, Move3d } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '@/components/i18n/Lang';
import { t } from '@/lib/i18n';
import { GestureHint } from '@/components/motion/GestureHint';

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
  const lang = useLang();
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
  const tr = (es: string) => t(lang, es);
  const tap = tr(touch ? 'Toca' : 'Haz clic en');
  const Icon = touch ? Hand : MousePointerClick;

  // la primera ayuda era una tarjeta grande ("Así se recorre el hotel") que tapaba el edificio
  // (Jacobo, 2026-11-24): ahora es la misma píldora pequeña de las demás
  const text =
    shown === 'explorar'
      ? `${tap} ${tr('el número de un piso para abrirlo')}`
      : shown === 'piso'
      ? `${tap} ${tr('una habitación para entrar')}`
      : shown === 'unidad'
        ? `${tap} ${tr('un espacio para verlo de cerca')}`
        : shown === 'espacio'
          ? tr('Arrastra para girar la maqueta')
          : tr('Arrastra para mirar alrededor');
  const HintIcon = shown === 'espacio' || shown === 'mirar' ? Move3d : Icon;

  // y una mano sobre la escena que muestra el gesto (Jacobo, 2026-11-26: "un dedito que señale dónde
  // tocar, para que la gente sepa qué hacer"): en el edificio y en el espacio se arrastra; en el
  // piso y la unidad se toca. Se va con la píldora (al primer gesto o a los pocos segundos).
  const drag = shown === 'explorar' || shown === 'espacio' || shown === 'mirar';

  return portal(
    <>
      <GestureHint
        x={window.innerWidth / 2}
        y={window.innerHeight * 0.55}
        kind={drag ? 'drag' : 'tap'}
        label={drag ? tr('Arrastra para girar') : tr(touch ? 'Toca aquí' : 'Haz clic aquí')}
      />
      <div
        role="status"
        className="pointer-events-none fixed inset-x-3 top-[calc(var(--safe-top,0px)+6.25rem)] z-40 flex justify-center md:top-28"
      >
        <p className="glass-dark flex animate-in items-center gap-2 rounded-full py-2 pr-4 pl-3 text-sm shadow-xl duration-500 fade-in slide-in-from-top-2">
          <span className="relative grid size-6 place-items-center">
            <span className="absolute size-6 animate-ping rounded-full bg-accent-on-dark/30" />
            <HintIcon aria-hidden className="relative size-4 text-accent-on-dark" />
          </span>
          {text}
        </p>
      </div>
    </>,
  );
}
