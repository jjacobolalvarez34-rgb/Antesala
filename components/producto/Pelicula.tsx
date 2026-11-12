'use client';

/* eslint-disable @next/next/no-img-element -- fotos estáticas livianas en public/demo */
import { useEffect, useRef, useState } from 'react';

import s from './landing.module.css';
import { useModo } from './modo';

/**
 * "Así se entra" (D-063): cuatro capítulos, de la calle al balcón. Cada clip
 * empieza y termina en una de las fotos, así que se encadenan sin cortes.
 * - Cine: el scroll mueve el tiempo del video (clips re-codificados con un
 *   cuadro clave por cuadro para que no salte).
 * - Ligero: sin video; la foto avanza con un acercamiento lento, pasa a la
 *   siguiente al final del capítulo y unos trazos de plano se dibujan encima.
 * En la puerta, la ranura de luz se abre con el scroll.
 *
 * Rendimiento: el scroll no pasa por React. Cada cuadro escribe estilos y el
 * tiempo del video directo en el DOM; React solo vuelve a pintar al cambiar de
 * capítulo (cuatro veces en toda la sección).
 */
const CAPS = [
  { t: 'La calle', d: 'Su huésped llega antes de llegar.', de: 'exterior-edificio', a: 'lobby', clip: '01-calle-lobby' },
  { t: 'El lobby', d: 'Recorre las zonas comunes.', de: 'lobby', a: 'pasillo-puerta-luz', clip: '02-lobby-pasillo' },
  { t: 'La puerta', d: 'La puerta de su suite se abre.', de: 'pasillo-puerta-luz', a: 'suite-dormitorio', clip: '03-puerta-suite' },
  { t: 'Su suite', d: 'Hasta el balcón, antes de reservar.', de: 'suite-dormitorio', a: 'suite-balcon', clip: '04-suite-balcon' },
];
const photo = (k: string) => `/demo/${k}-1600.webp`;

export function Pelicula() {
  const modo = useModo();
  const sec = useRef<HTMLElement>(null);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const phA = useRef<(HTMLImageElement | null)[]>([]);
  const phB = useRef<(HTMLImageElement | null)[]>([]);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const trazos = useRef<(SVGPathElement | null)[]>([]);
  const slit = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<boolean[]>([false, false, false, false]);
  const readyRef = useRef(ready);
  const [i, setI] = useState(0);
  const [wide, setWide] = useState(true);
  // los videos se piden solo cuando la sección está cerca (no al abrir la página)
  const [near, setNear] = useState(false);
  const cine = modo === 'cine';
  const conVideo = cine && near;
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    readyRef.current = ready;
    kick.current();
  }, [ready]);

  useEffect(() => {
    const el = sec.current;
    if (!el || near) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '120% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    const t = window.setTimeout(() => setWide(window.innerWidth > 900), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastI = -1;
    // el scroll da la meta; lo que se ve la persigue con inercia. Con la rueda
    // del mouse el scroll avanza a saltos de ~100 px y el video saltaba de la
    // calle al lobby en un solo cuadro (reporte de Jacobo, 2026-11-12).
    let target = 0;
    let cur = -1;
    let last = performance.now();
    const readTarget = () => {
      const el = sec.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      // fuera de la pantalla no hay nada que mover
      if (r.bottom < 0 || r.top > window.innerHeight) return false;
      const span = el.offsetHeight - window.innerHeight;
      target = Math.min(1, Math.max(0, -r.top / span));
      return true;
    };
    const paint = (p: number) => {
      const x = p * CAPS.length;
      const ci = Math.min(CAPS.length - 1, Math.floor(x));
      const t = Math.min(1, x - ci);
      if (ci !== lastI) {
        lastI = ci;
        setI(ci);
      }
      const rd = readyRef.current;
      for (let k = 0; k < CAPS.length; k++) {
        const tk = k === ci ? t : k < ci ? 1 : 0;
        const vidOn = cine && rd[k];
        const a = phA.current[k];
        if (a) {
          a.style.opacity = vidOn ? '0' : '1';
          a.style.transform = vidOn ? 'none' : `scale(${1 + tk * 0.12})`;
        }
        const b = phB.current[k];
        if (b) {
          b.style.opacity = vidOn ? '0' : String(Math.max(0, (tk - 0.72) / 0.28));
          b.style.transform = `scale(${1.04 + tk * 0.04})`;
        }
        const bar = bars.current[k];
        if (bar) bar.style.transform = `scaleX(${tk})`;
      }
      trazos.current.forEach((path, j) => {
        if (path) path.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, t * 1.6 - j * 0.3)));
      });
      const sl = slit.current;
      if (sl) {
        const on = ci === 2 && !(cine && rd[2]);
        sl.style.opacity = on ? String(Math.min(1, t * 3)) : '0';
        sl.style.transform = `translate(-50%, -50%) scaleX(${on ? Math.max(0.02, t * t) : 0.02})`;
      }
      const v = vids.current[ci];
      // un cuadro a la vez: si el anterior todavía se está buscando, se espera
      if (v && !v.seeking && v.readyState >= 1 && Number.isFinite(v.duration)) {
        const want = t * (v.duration - 0.05);
        if (Math.abs(v.currentTime - want) > 1 / 60) {
          try {
            v.currentTime = want;
          } catch {
            /* el navegador todavía no puede buscar */
          }
        }
      }
    };
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!readTarget()) return;
      if (cur < 0) cur = target;
      // ~0,35 s para alcanzar la meta, igual a cualquier tasa de refresco
      cur += (target - cur) * (1 - Math.exp(-dt * 9));
      if (Math.abs(target - cur) < 0.0004) cur = target;
      paint(cur);
      if (cur !== target) raf = requestAnimationFrame(frame);
    };
    const on = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    kick.current = on;
    if (readTarget()) {
      cur = target;
      paint(cur);
    }
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cine]);

  const cap = CAPS[i]!;

  return (
    <>
      <div className={s.entrarHead}>
        <div className={s.kicker}>Así se entra</div>
        <h2>De la calle a su suite</h2>
        <p className={s.lead}>
          Así ve su huésped el hotel antes de reservar. Baje despacio: el video avanza con usted.
        </p>
      </div>
      <section ref={sec} id="entrar" aria-label="Así se entra al hotel" className={s.entrar} data-modo={cine ? 'cine' : 'ligero'}>
        <div className={s.film}>
          {CAPS.map((c, k) => (
            <div key={c.clip} className={`${s.clip} ${k === i ? s.clipOn : ''}`}>
              {/* foto de respaldo (y modo ligero): acercamiento lento y paso a la siguiente */}
              <img
                ref={(el) => {
                  phA.current[k] = el;
                }}
                className={s.clipPh}
                src={photo(c.de)}
                alt=""
                loading={k === 0 ? 'eager' : 'lazy'}
              />
              <img
                ref={(el) => {
                  phB.current[k] = el;
                }}
                className={s.clipPh}
                src={photo(c.a)}
                alt=""
                loading="lazy"
                style={{ opacity: 0 }}
              />
              {conVideo ? (
                <video
                  ref={(v) => {
                    vids.current[k] = v;
                  }}
                  className={s.clipVid}
                  src={`/demo/video/${c.clip}-${wide ? 1280 : 720}.mp4`}
                  muted
                  playsInline
                  preload={Math.abs(k - i) <= 1 ? 'auto' : 'metadata'}
                  onLoadedData={() => setReady((r) => (r[k] ? r : r.map((x, j) => (j === k ? true : x))))}
                  style={{ opacity: ready[k] ? 1 : 0 }}
                />
              ) : null}
            </div>
          ))}

          {/* trazos de plano (modo ligero): marco, ejes y cotas que se dibujan con el scroll */}
          {!cine ? (
            <svg className={s.filmTrazos} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden>
              {['M60 60H940V540H60Z', 'M500 60V540M60 300H940', 'M60 80H120M880 80H940M60 520H120M880 520H940'].map((d, j) => (
                <path
                  key={d}
                  ref={(el) => {
                    trazos.current[j] = el;
                  }}
                  pathLength={1}
                  d={d}
                />
              ))}
            </svg>
          ) : null}

          {/* la ranura de luz se abre en el capítulo de la puerta */}
          <div ref={slit} className={s.slit} style={{ opacity: 0 }} />
          <div className={s.shade} />
          <div className={s.filmCap} aria-live="polite">
            <div className={s.kicker}>Así se entra · {String(i + 1).padStart(2, '0')}</div>
            <h2>{cap.t}</h2>
            <p className={s.lead}>{cap.d}</p>
          </div>
          <div className={s.bar} aria-hidden>
            {CAPS.map((c, k) => (
              <i key={c.clip}>
                <b
                  ref={(el) => {
                    bars.current[k] = el;
                  }}
                  style={{ transform: 'scaleX(0)' }}
                />
              </i>
            ))}
          </div>
          <span className={s.filmFict}>Imágenes y video ilustrativos</span>
        </div>
      </section>
    </>
  );
}
