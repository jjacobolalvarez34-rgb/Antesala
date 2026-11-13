'use client';

import { useEffect, useRef, useState } from 'react';

import s from './landing.module.css';

/**
 * Intro de la página de Antesala (D-063), del boceto: los pilares suben, la
 * ranura se dibuja, la luz llena la pantalla mientras los pilares se abren como
 * puertas y la cámara del recorrido cae sobre el edificio. Una vez por sesión
 * (?intro=1 la fuerza); se salta con clic, tecla o "Saltar". Con movimiento
 * reducido se acorta y queda en fundidos. Avisa al recorrido con el evento
 * "antesala-intro" cuando la cámara debe empezar a caer.
 */
const KEY = 'antesala:intro-web';

/**
 * Se ejecuta al leer el HTML, antes de pintar: si toca intro, marca <html> y una
 * cortina azul noche tapa la página desde el primer cuadro (antes se veía la
 * página un instante y luego empezaba la intro).
 */
export const INTRO_PREPAINT = `try{var f=new URLSearchParams(location.search).get('intro')==='1';if(f||!sessionStorage.getItem('${KEY}')){var d=document.createElement('div');d.id='intro-cortina';d.style.cssText='position:fixed;inset:0;z-index:99;background:#111b33;transition:opacity .5s;animation:intro-cortina .4s ease 9s forwards';document.documentElement.appendChild(d)}}catch(e){}`;

/** quita la cortina de antes de pintar (fuera de React: así la hidratación no la borra antes de tiempo) */
const dropCurtain = () => {
  const c = document.getElementById('intro-cortina');
  if (!c) return;
  c.style.opacity = '0';
  window.setTimeout(() => c.remove(), 500);
};

export function Intro() {
  const [show, setShow] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<SVGSVGElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const beam = useRef<HTMLDivElement>(null);
  const finishRef = useRef<() => void>(() => {});

  // decide antes de pintar el recorrido: si toca intro, el recorrido espera el evento
  useEffect(() => {
    let force = false;
    let seen = false;
    try {
      force = new URLSearchParams(location.search).get('intro') === '1';
      seen = sessionStorage.getItem(KEY) !== null;
    } catch {
      seen = true;
    }
    if (seen && !force) return;
    window.__antesalaIntroPlaying = true;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
    const t = window.setTimeout(() => setShow(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    const el = root.current;
    const svg = logo.current;
    if (!el || !svg) return;
    // D-067: la intro se ve completa aunque el sistema pida movimiento reducido
    const RM = false;
    // 1,7 veces más lenta que la primera versión: la gente decía que no alcanzaba a verla
    const S = 1.7;
    const parts = Array.from(svg.querySelectorAll('path'));
    const slit = svg.querySelector('rect');
    const left = parts.filter((_, i) => i % 2 === 0);
    const right = parts.filter((_, i) => i % 2 === 1);
    const anims: Animation[] = [];
    const timers: number[] = [];
    let done = false;
    let started = false;
    const A = (node: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      if (typeof node.animate !== 'function') return;
      anims.push(node.animate(kf, { fill: 'both', easing: 'cubic-bezier(.2,.7,.2,1)', ...o }));
    };
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms * S));
    const startStage = () => {
      if (started) return;
      started = true;
      window.__antesalaIntroPlaying = false;
      window.dispatchEvent(new Event('antesala-intro'));
    };
    document.body.style.overflow = 'hidden';

    parts.forEach((p, i) =>
      A(p, RM ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(46px)' }, { opacity: 1, transform: 'none' }], {
        duration: 800 * S,
        delay: (i % 2 === 0 ? i : i - 1) * 45 * S,
      }),
    );
    if (slit) {
      (slit as SVGElement).style.transformOrigin = '50% 100%';
      A(slit, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 600 * S, delay: 600 * S });
    }
    if (word.current) {
      A(word.current, [{ opacity: 0, letterSpacing: '.7em' }, { opacity: 1, letterSpacing: '.5em' }], { duration: 700 * S, delay: 700 * S });
    }
    at(1400, () => {
      const b = beam.current;
      const r = slit ? slit.getBoundingClientRect() : { left: innerWidth / 2 - 1, top: innerHeight * 0.3, width: 2, height: innerHeight * 0.4 };
      if (b) {
        // solo transform (no left/top/width/height): la luz crece sin mover el diseño de la página
        const from = `translate(${r.left}px, ${r.top}px) scale(${Math.max(2, r.width) / innerWidth}, ${r.height / innerHeight})`;
        Object.assign(b.style, { transform: from, opacity: '1' });
        A(b, [{ transform: from }, { transform: 'none' }], { duration: 800 * S, easing: 'cubic-bezier(.7,0,.3,1)' });
      }
      if (slit) (slit as SVGElement).style.opacity = '0';
      const open = (dx: number) => [{ transform: 'none', opacity: 1 }, { transform: RM ? 'none' : `translateX(${dx}px)`, opacity: 0 }];
      left.forEach((p) => A(p, open(-60), { duration: 800 * S, easing: 'cubic-bezier(.7,0,.3,1)' }));
      right.forEach((p) => A(p, open(60), { duration: 800 * S, easing: 'cubic-bezier(.7,0,.3,1)' }));
      if (word.current) A(word.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 * S });
    });
    at(2200, () => {
      // la cortina de antes de pintar se quita justo cuando la intro empieza a desvanecerse
      dropCurtain();
      el.style.background = 'transparent';
      startStage();
      A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 800 * S, easing: 'ease-out' });
    });

    const finish = () => {
      if (done) return;
      done = true;
      dropCurtain();
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      document.body.style.overflow = '';
      startStage();
      setShow(false);
    };
    finishRef.current = finish;
    at(3000, finish);
    const onKey = () => finish();
    document.addEventListener('keydown', onKey, { once: true });
    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      dropCurtain();
      startStage();
    };
  }, [show]);

  if (!show) return null;
  return (
    <div ref={root} className={s.intro} onClick={() => finishRef.current()} aria-hidden>
      <svg ref={logo} className={s.introLogo} viewBox="14 8 92 136">
        <path d="M30 140V44L44 16V140Z" fill="#D2B88C" />
        <path d="M90 140V44L76 16V140Z" fill="#D2B88C" />
        <path d="M44 16L48 22V137L44 140Z" fill="#957C55" />
        <path d="M76 16L72 22V137L76 140Z" fill="#957C55" />
        <path d="M20 140V64L24 57V140Z" fill="#D2B88C" />
        <path d="M100 140V64L96 57V140Z" fill="#D2B88C" />
        <rect x="58.6" y="30" width="2.8" height="110" fill="#F2E8D6" />
      </svg>
      <div ref={word} className={s.introWord}>
        ANTESALA
      </div>
      <div ref={beam} className={s.beam} />
      <button
        type="button"
        className={s.skip}
        onClick={(e) => {
          e.stopPropagation();
          finishRef.current();
        }}
      >
        Saltar
      </button>
    </div>
  );
}
