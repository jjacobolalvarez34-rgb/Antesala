'use client';

/* eslint-disable @next/next/no-img-element -- fotos estáticas livianas en public/demo */
import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useRef, useState } from 'react';

import { PlanSvg, type PlanSpaceMeta } from '@/components/plan/PlanSvg';
import type { PlanGeometry } from '@/lib/types';

import s from './landing.module.css';
import { useModo } from './modo';
import { PlanoLigero } from './PlanoLigero';
import type { StageApi } from './stage3d';

export interface RecorridoData {
  hotelName: string;
  floors: number;
  hlFloor: number;
  hlUnit: number;
  /** ancho y alto del edificio en metros (cotas del modo ligero) */
  widthM: number;
  heightM: number;
  unitName: string;
  unitHref: Route;
  levelName: string;
  view: string;
  area: string;
  basePrice: string;
  premium: string;
  total: string;
  plan: PlanGeometry;
  planSpaces: PlanSpaceMeta[];
  photos: { key: string; label: string; src: string }[];
}

const STEPS = [
  {
    t: 'EL EDIFICIO',
    lead: 'Todo el hotel, de un vistazo.',
    sees: 'El hotel entero, en 3D, con sus zonas comunes.',
    solves: 'Que se entienda el lugar antes de la primera foto.',
  },
  {
    t: 'SU PISO',
    lead: (d: RecorridoData) => `El ${d.levelName.toLowerCase()} se separa del resto.`,
    sees: 'En qué piso queda y qué hay en él.',
    solves: 'Los pisos altos y la vista se ven, y se pueden vender.',
  },
  {
    t: 'LA UNIDAD EXACTA',
    lead: (d: RecorridoData) => `La ${d.unitName.replace(/^\D+/, '')}, no "una suite cualquiera".`,
    sees: 'Cuál es su unidad, dónde queda y hacia dónde mira.',
    solves: 'La unidad exacta puede llevar un valor extra.',
  },
  {
    t: 'EL PLANO',
    lead: 'Metros reales, espacios que se tocan.',
    sees: 'Cómo se conectan los espacios y cuánto mide cada uno.',
    solves: 'Responde "¿el baño está dentro?" antes de que se lo pregunten.',
  },
  {
    t: 'CADA ESPACIO',
    lead: 'Foto o 360°, espacio por espacio.',
    sees: 'El baño, la sala y el balcón, tal como son.',
    solves: 'Menos sorpresas al llegar y menos reclamos.',
  },
  {
    t: 'LA RESERVA',
    lead: 'Directo a su motor o a su WhatsApp.',
    sees: 'La unidad que eligió, con su precio claro.',
    solves: 'La reserva entra por su canal, sin comisión de intermediarios.',
  },
];
const RAIL = ['Edificio', 'Piso', 'Unidad', 'Plano', 'Espacio', 'Reserva'];

declare global {
  interface Window {
    __antesalaIntroPlaying?: boolean;
  }
}

export function Recorrido({ data, onReserve }: { data: RecorridoData; onReserve: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const api = useRef<StageApi | null>(null);
  const [step, setStep] = useState(0);
  const [no3d, setNo3d] = useState(false);
  const modo = useModo();
  const ligero = modo === 'ligero' || no3d;

  // el 3D se carga aparte (three.js no entra en el JS inicial) y solo en modo cine
  useEffect(() => {
    if (modo !== 'cine') return;
    let alive = true;
    const reduced = false; // D-067
    const begin = (fromIntro: boolean) => api.current?.start(fromIntro);
    const onIntro = () => begin(true);
    // three.js se pide cuando la página terminó de cargar y el equipo está libre
    const whenFree = new Promise<void>((res) => {
      const idle = () => {
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => res(), { timeout: 2500 });
        else setTimeout(res, 800);
      };
      if (document.readyState === 'complete') idle();
      else window.addEventListener('load', idle, { once: true });
    });
    whenFree
      .then(() => import('./stage3d'))
      .then(({ initStage }) => {
        if (!alive || !canvasRef.current || !stageRef.current) return;
        const a = initStage(canvasRef.current, stageRef.current, {
          floors: data.floors,
          hlFloor: data.hlFloor,
          hlUnit: data.hlUnit,
          reduced,
        });
        if (!a) {
          setNo3d(true);
          return;
        }
        api.current = a;
        if (window.__antesalaIntroPlaying) window.addEventListener('antesala-intro', onIntro, { once: true });
        else begin(false);
      })
      .catch(() => alive && setNo3d(true));
    return () => {
      alive = false;
      window.removeEventListener('antesala-intro', onIntro);
      api.current?.dispose();
      api.current = null;
    };
  }, [modo, data.floors, data.hlFloor, data.hlUnit]);

  // paso activo = el último cuyo borde superior ya pasó el centro de la pantalla.
  // Antes, en los huecos entre pasos y en el espacio final no había ninguno y se
  // volvía al paso 0: el edificio se reiniciaba (reporte de Jacobo, 2026-11-12).
  useEffect(() => {
    let raf = 0;
    const pick = () => {
      raf = 0;
      const steps = stepsRef.current?.querySelectorAll<HTMLElement>('[data-step]');
      if (!steps) return;
      const mid = window.innerHeight * 0.5;
      let best = 0;
      steps.forEach((el) => {
        if (el.getBoundingClientRect().top <= mid) best = Number(el.dataset.step);
      });
      setStep((p) => (p === best ? p : best));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    api.current?.setStep(step);
  }, [step]);

  const goTo = useCallback((n: number) => {
    const el = stepsRef.current?.querySelector<HTMLElement>(`[data-step="${n}"]`);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
  }, []);

  return (
    <section id="recorrido" aria-label="Así recorre su huésped el hotel" className={s.recorrido}>
      <div ref={stageRef} className={s.stage} data-step={step} data-modo={ligero ? 'ligero' : 'cine'}>
        {modo === null ? null : ligero ? (
          <PlanoLigero
            floors={data.floors}
            hlFloor={data.hlFloor}
            hlUnit={data.hlUnit}
            step={step}
            name={data.hotelName}
            unitLabel={data.unitName}
            widthM={data.widthM}
            heightM={data.heightM}
          />
        ) : (
          <canvas key="c" ref={canvasRef} className={s.canvas} aria-hidden />
        )}

        <div className={s.layers}>
          <div className={`${s.layer} ${step === 4 ? s.layerOn : ''}`} aria-hidden={step !== 4}>
            {/* el ancho sale del alto disponible: un plano alto ya no se corta abajo */}
            <div className={s.paper} style={{ ['--r' as string]: (data.plan.width / data.plan.height).toFixed(3) }}>
              <div className={s.paperHead}>
                <b>{data.unitName.toUpperCase()}</b>
                <span>{data.area} · plano de la unidad</span>
              </div>
              <PlanSvg geometry={data.plan} spaces={data.planSpaces} title={`Plano de ${data.unitName}`} />
              <p className={s.planNote}>
                Toque un espacio para entrar. <b>¿El baño está dentro?</b> Sí, junto al dormitorio.
              </p>
            </div>
          </div>

          <div className={`${s.layer} ${step === 5 ? s.layerOn : ''}`} aria-hidden={step !== 5}>
            {/* mosaico: todos los espacios de la unidad a la vez, entran uno tras otro */}
            <ul className={s.mosaic} aria-label={`Espacios de la ${data.unitName}`}>
              {data.photos.map((p, k) => (
                <li key={p.key} className={s.tile} style={{ ['--i' as string]: k }}>
                  <img src={p.src} alt={`${p.label} (imagen ilustrativa)`} width={960} height={720} loading="lazy" />
                  <span>{p.label}</span>
                </li>
              ))}
            </ul>
            <p className={s.mosaicNote}>Imágenes ilustrativas</p>
          </div>

          <div className={`${s.layer} ${step === 6 ? s.layerOn : ''}`} aria-hidden={step !== 6}>
            <div className={s.book}>
              <div className={s.kicker}>{data.hotelName} · hotel ficticio</div>
              <h3 style={{ marginTop: 18 }}>{data.unitName.toUpperCase()}</h3>
              <div className={s.it} style={{ fontSize: 19 }}>
                {data.levelName} · {data.view}
              </div>
              <div style={{ marginTop: 16 }}>
                <div className={s.row}>
                  <span className={s.muted}>Tarifa base</span>
                  <span>{data.basePrice}</span>
                </div>
                <div className={s.row} style={{ borderBottom: 0 }}>
                  <span className={s.muted}>Piso alto con vista</span>
                  <span>+ {data.premium}</span>
                </div>
              </div>
              <div className={s.total}>
                <span className={s.muted}>Por noche</span>
                <b>{data.total}</b>
              </div>
              <button type="button" className={`${s.btn} ${s.solid}`} style={{ width: '100%', justifyContent: 'center' }} onClick={onReserve}>
                Reservar esta suite
              </button>
              <p className={s.tiny} style={{ margin: '14px 0 0' }}>
                Va a su motor de reservas o a su WhatsApp. Sin intermediarios.
              </p>
            </div>
          </div>
        </div>

        <nav className={s.rail} aria-label="Pasos del recorrido">
          {RAIL.map((r, i) => (
            <button key={r} type="button" aria-current={step === i + 1 ? 'step' : undefined} onClick={() => goTo(i + 1)}>
              <span>{r}</span>
            </button>
          ))}
        </nav>
        <div className={s.scrollhint} aria-hidden>
          Baje
          <i />
        </div>
      </div>

      <div ref={stepsRef} className={s.steps} data-modo={ligero ? 'ligero' : 'cine'}>
        <div className={`${s.step} ${s.heroStep}`} data-step={0} id="hero">
          <div className={s.heroCard}>
            <div className={`${s.kicker} ${s.heroFade}`}>Recorridos para hoteles</div>
            <h1 className={s.heroFade} style={{ marginTop: 26 }}>
              Su hotel,
              <br />
              antes de llegar.
            </h1>
            <p className={`${s.lead} ${s.heroFade}`}>Su huésped recorre cada espacio antes de reservar.</p>
            <div className={`${s.ctas} ${s.heroFade}`}>
              <a className={`${s.btn} ${s.solid}`} href="#paso-1">
                Ver cómo funciona <span className={s.arr}>↓</span>
              </a>
              <a className={s.btn} href="#demos">
                Probar la demo
              </a>
            </div>
          </div>
        </div>
        {STEPS.map((st, i) => (
          <div key={st.t} className={s.step} data-step={i + 1} id={`paso-${i + 1}`}>
            <div className={s.card}>
              <div className={s.num}>0{i + 1} / 06</div>
              <h2>{st.t}</h2>
              <p className={s.lead}>{typeof st.lead === 'function' ? st.lead(data) : st.lead}</p>
              <dl>
                <div>
                  <dt>El huésped ve</dt>
                  <dd>{st.sees}</dd>
                </div>
                <div>
                  <dt>Su hotel resuelve</dt>
                  <dd>{st.solves}</dd>
                </div>
              </dl>
              {i === 5 ? (
                <Link className={s.btn} href={data.unitHref} style={{ marginTop: 24 }}>
                  Recorrer la {data.unitName} <span className={s.arr}>→</span>
                </Link>
              ) : null}
            </div>
          </div>
        ))}
        <div style={{ height: '30vh' }} />
      </div>
    </section>
  );
}
