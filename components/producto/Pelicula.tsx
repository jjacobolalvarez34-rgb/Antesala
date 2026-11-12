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
  const [ready, setReady] = useState<boolean[]>([false, false, false, false]);
  const [pos, setPos] = useState({ i: 0, t: 0 });
  const [wide, setWide] = useState(true);
  const cine = modo === 'cine';

  useEffect(() => {
    const t = window.setTimeout(() => setWide(window.innerWidth > 900), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sec.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / span));
      const x = p * CAPS.length;
      const i = Math.min(CAPS.length - 1, Math.floor(x));
      const t = Math.min(1, x - i);
      setPos((o) => (o.i === i && Math.abs(o.t - t) < 0.004 ? o : { i, t }));
      const v = vids.current[i];
      if (v && v.readyState >= 1 && Number.isFinite(v.duration)) {
        try {
          v.currentTime = t * (v.duration - 0.05);
        } catch {
          /* el navegador todavía no puede buscar */
        }
      }
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cine]);

  const { i, t } = pos;
  const cap = CAPS[i]!;

  return (
    <section ref={sec} id="entrar" aria-label="Así se entra al hotel" className={s.entrar} data-modo={cine ? 'cine' : 'ligero'}>
      <div className={s.film}>
        {CAPS.map((c, k) => {
          const on = k === i;
          const tk = k === i ? t : k < i ? 1 : 0;
          return (
            <div key={c.clip} className={`${s.clip} ${on ? s.clipOn : ''}`}>
              {/* foto de respaldo (y modo ligero): acercamiento lento y paso a la siguiente */}
              <img
                className={s.clipPh}
                src={photo(c.de)}
                alt=""
                loading={k === 0 ? 'eager' : 'lazy'}
                style={cine && ready[k] ? { opacity: 0 } : { transform: `scale(${1 + tk * 0.12})` }}
              />
              {!cine || !ready[k] ? (
                <img
                  className={s.clipPh}
                  src={photo(c.a)}
                  alt=""
                  loading="lazy"
                  style={{ opacity: Math.max(0, (tk - 0.72) / 0.28), transform: `scale(${1.04 + tk * 0.04})` }}
                />
              ) : null}
              {cine ? (
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
          );
        })}

        {/* trazos de plano (modo ligero): marco, ejes y cotas que se dibujan con el scroll */}
        {!cine ? (
          <svg className={s.filmTrazos} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden>
            <path pathLength={1} style={{ strokeDashoffset: 1 - Math.min(1, t * 1.6) }} d="M60 60H940V540H60Z" />
            <path pathLength={1} style={{ strokeDashoffset: 1 - Math.min(1, Math.max(0, t * 1.6 - 0.3)) }} d="M500 60V540M60 300H940" />
            <path pathLength={1} style={{ strokeDashoffset: 1 - Math.min(1, Math.max(0, t * 1.6 - 0.6)) }} d="M60 80H120M880 80H940M60 520H120M880 520H940" />
          </svg>
        ) : null}

        {/* la ranura de luz se abre en el capítulo de la puerta */}
        {i === 2 && !(cine && ready[2]) ? (
          <div className={s.slit} style={{ opacity: Math.min(1, t * 3), width: `${Math.max(2, t * t * 100)}vw` }} />
        ) : null}
        <div className={s.shade} />
        <div className={s.filmCap} aria-live="polite">
          <div className={s.kicker}>Así se entra · {String(i + 1).padStart(2, '0')}</div>
          <h2>{cap.t}</h2>
          <p className={s.lead}>{cap.d}</p>
        </div>
        <div className={s.bar} aria-hidden>
          {CAPS.map((c, k) => (
            <i key={c.clip}>
              <b style={{ transform: `scaleX(${k < i ? 1 : k === i ? t : 0})` }} />
            </i>
          ))}
        </div>
        <span className={s.filmFict}>Imágenes y video ilustrativos</span>
      </div>
    </section>
  );
}
