'use client';

/* eslint-disable @next/next/no-img-element -- imágenes prerenderizadas a la medida de la toma; next/image no aplica */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useMotionValue, useTransform, type Transition } from 'motion/react';
import { ArrowLeft, ChevronDown, ChevronUp, Moon, Move3d, RotateCcw, Sun, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Gallery } from '@/components/gallery/Gallery';
import { useLang, useRoutes, useT } from '@/components/i18n/Lang';
import { LangSwitch } from '@/components/i18n/LangSwitch';
import { ModeSwitch } from '@/components/hotel/TourChooser';
import { PanoButton } from '@/components/pano/PanoButton';
import { PlanSvg } from '@/components/plan/PlanSvg';
import type { GuidedData, GuidedLevel, GuidedOrient, GuidedUnit, P2 } from '@/lib/guided-types';
import { formatArea, formatPrice, offerTexts, pluralize } from '@/lib/hotel';
import { polygonLabelPoint } from '@/lib/plan';
import type { Offer } from '@/lib/types';
import { cn } from '@/lib/utils';

/*
 * Vista guiada (D-095), a pantalla completa. Tres capas sobre un mismo fondo:
 *  1. el edificio: la llegada en video y luego la torre quieta; los pisos se iluminan al pasar;
 *  2. el piso: solo la planta, que entra girando mientras el edificio se acerca y se desvanece;
 *  3. la unidad: la planta se acerca a ella y se abre su ficha (plano, fotos, 360°).
 * De día o de noche (la misma cámara: los contornos sirven para las dos).
 * Nada de 3D en vivo: imágenes y transformaciones CSS, para que vaya fluido en cualquier celular.
 */

type Box = { s: number; left: number; top: number; w: number; h: number };
type Chrome = { W: number; H: number; desktop: boolean; barTop: number };
type Shot = { img: string; night?: string; spaces: { id: string; kind: 'unit' | 'poi'; poly: P2[] }[]; w: number; h: number };

const FREE = '#4d6b3c';
const TAKEN = '#9a4a33';
const EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];
/** alto de la fila de arriba (marca o controles) */
const TOP = 76;

// ---------------------------------------------------------------- medidas

/** Tamaño de la pantalla y dónde empieza la barra de reserva (en el celular, abajo de borde a borde). */
function useChrome(unitKey: string | null): Chrome | null {
  const [c, setC] = useState<Chrome | null>(null);
  useEffect(() => {
    const measure = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const bar = document.querySelector('[data-booking-bar]')?.getBoundingClientRect();
      const desktop = W >= 768;
      // en escritorio la reserva es una tarjeta en la esquina: no tapa el centro
      setC({ W, H, desktop, barTop: desktop || !bar ? H : Math.min(H, bar.top) });
    };
    measure();
    // la barra de reserva entra y sale con la habitación: se mide otra vez cuando ya está
    const late = [window.setTimeout(measure, 60), window.setTimeout(measure, 420)];
    window.addEventListener('resize', measure);
    return () => {
      late.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('resize', measure);
    };
  }, [unitKey]);
  return c;
}

function bbox(pts: P2[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/** La torre: cubre la pantalla si cabe; si no, se achica hasta que todos los pisos queden a la vista. */
function fitBuilding(o: GuidedOrient, c: Chrome): Box {
  const bands = Object.values(o.floors ?? {});
  const b = bbox(bands.flat());
  // el techo (y la pérgola) sobre el último piso: más o menos un piso más de alto
  b.y0 -= ((b.y1 - b.y0) / Math.max(1, bands.length)) * 1.1;
  // arriba, la fila de la marca y los controles (en el celular); abajo, la reserva
  const top = c.desktop ? 28 : TOP + 8;
  const bottom = c.barTop - (c.desktop ? 28 : 12);
  const sCover = Math.max(c.W / o.w, c.H / o.h);
  const sFit = (bottom - top) / ((b.y1 - b.y0) * o.h);
  // si los pisos ocupan poco (un edificio bajo y ancho, como Niebla Alta en vertical), la imagen se
  // agranda hasta 1,5 veces, sin que el edificio se salga a lo ancho
  // deja sitio a la derecha para los números de piso (~90 px en el celular)
  const sWide = (c.W - (c.desktop ? 220 : 96) - 16) / ((b.x1 - b.x0) * o.w);
  const s = sFit < sCover ? sFit : Math.min(sFit, sCover * 1.5, Math.max(sCover, sWide));
  const w = o.w * s;
  const h = o.h * s;
  // en el celular, la torre y sus números se centran juntos (los números van a la derecha)
  let left = (c.W - (c.desktop ? 0 : 80)) / 2 - ((b.x0 + b.x1) / 2) * w;
  if (w >= c.W) left = Math.min(0, Math.max(c.W - w, left));
  let t = (top + bottom) / 2 - ((b.y0 + b.y1) / 2) * h;
  if (h >= c.H) t = Math.min(0, Math.max(c.H - h, t));
  return { s, left, top: t, w, h };
}

/** Encaja un rectángulo de la imagen (en 0..1) dentro de un área de la pantalla. */
function fitRect(
  img: { w: number; h: number },
  r: { x0: number; y0: number; x1: number; y1: number },
  area: { l: number; t: number; r: number; b: number },
  max: number,
): Box {
  const bw = (r.x1 - r.x0) * img.w;
  const bh = (r.y1 - r.y0) * img.h;
  const s = Math.min((area.r - area.l) / bw, (area.b - area.t) / bh, max);
  const w = img.w * s;
  const h = img.h * s;
  return { s, w, h, left: (area.l + area.r) / 2 - ((r.x0 + r.x1) / 2) * w, top: (area.t + area.b) / 2 - ((r.y0 + r.y1) / 2) * h };
}

/** Margen alrededor de la planta: más arriba, donde suben los muros en la toma en 3/4. */
function padded(r: ReturnType<typeof bbox>, k = 1) {
  const bw = r.x1 - r.x0;
  const bh = r.y1 - r.y0;
  return { x0: r.x0 - bw * 0.05 * k, x1: r.x1 + bw * 0.05 * k, y0: r.y0 - bh * 0.14 * k, y1: r.y1 + bh * 0.06 * k };
}

const toPath = (poly: P2[], w: number, h: number) => `M${poly.map(([x, y]) => `${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`).join('L')}Z`;

// ---------------------------------------------------------------- precarga

const loaded = new Map<string, Promise<void>>();
/** Baja y decodifica una imagen; la transición espera a que esté lista (o 700 ms como mucho). */
function preload(src: string | undefined) {
  if (!src) return Promise.resolve();
  let p = loaded.get(src);
  if (!p) {
    const img = new Image();
    img.src = src;
    p = img.decode().catch(() => undefined);
    loaded.set(src, p);
  }
  return Promise.race([p, new Promise<void>((r) => setTimeout(r, 700))]);
}

/** Imagen de día y de noche una sobre otra: cambiar es un fundido. */
function DayNight({
  day,
  night,
  isNight,
  className,
  style,
}: {
  day?: string;
  night?: string;
  isNight: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <>
      {/* la de día también se apaga de noche: en el borde que se funde con el fondo se asomaba
          (una franja clara arriba, Jacobo 2026-11-26) */}
      <img
        src={day}
        alt=""
        draggable={false}
        className={cn('absolute inset-0 size-full transition-opacity duration-700 ease-out select-none', night && isNight ? 'opacity-0' : 'opacity-100', className)}
        style={style}
      />
      {night ? (
        <img
          src={night}
          alt=""
          draggable={false}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-700 ease-out select-none',
            isNight ? 'opacity-100' : 'opacity-0',
            className,
          )}
          style={style}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- vista

export function GuidedView({ data, offer }: { data: GuidedData; offer?: Offer }) {
  const tr = useT();
  const lang = useLang();
  const routes = useRoutes();
  const o = offerTexts(offer, lang);
  const params = useSearchParams();
  const chrome = useChrome(params.get('u'));

  // ?u= solo también sirve (desde el modo libre): el piso sale de la unidad
  const unitId = params.get('u');
  const levelId = params.get('piso') ?? (unitId ? (data.units[unitId]?.levelId ?? null) : null);
  const level = data.levels.find((l) => l.id === levelId) ?? null;
  const unit = unitId && level && data.units[unitId]?.levelId === level.id ? data.units[unitId] : null;

  // horizontal o vertical según la pantalla; si falta una toma, la otra
  const orientKey: 'h' | 'v' | null = chrome
    ? chrome.W / chrome.H < 0.85
      ? data.orients.v
        ? 'v'
        : 'h'
      : data.orients.h
        ? 'h'
        : 'v'
    : null;
  const orient = orientKey ? data.orients[orientKey] : undefined;

  // de noche: si hay tomas de noche, empieza según la hora (como el 3D) y se cambia con el botón
  const hasNight = !!orient?.night?.pisos;
  const [nightPick, setNight] = useState<boolean | null>(null);
  const [clockNight] = useState(() => {
    const h = new Date().getHours();
    return h >= 18 || h < 6;
  });
  const night = hasNight && (nightPick ?? clockNight);

  /** la planta de un piso en esta orientación (o en la otra, si aquí no está) */
  const floorShot = useCallback(
    (id: string): Shot | null => {
      for (const k of [orientKey, orientKey === 'h' ? 'v' : 'h'] as const) {
        const ot = k ? data.orients[k] : undefined;
        const l = ot?.levels?.[id];
        if (ot && l) return { ...l, w: l.w ?? ot.w, h: l.h ?? ot.h };
      }
      return null;
    },
    [data.orients, orientKey],
  );
  const floorImg = useCallback(
    (id: string) => {
      const s = floorShot(id);
      return night ? (s?.night ?? s?.img) : s?.img;
    },
    [floorShot, night],
  );

  // la URL manda (atrás del celular incluido); se cambia sin pedir nada al servidor
  const go = useCallback(
    (next: { piso?: string | null; u?: string | null }) => {
      const q = new URLSearchParams();
      if (next.piso) q.set('piso', next.piso);
      if (next.piso && next.u) q.set('u', next.u);
      const qs = q.toString();
      window.history.pushState(null, '', `${routes.guiada(data.slug)}${qs ? `?${qs}` : ''}`);
    },
    [routes, data.slug],
  );

  const openLevel = useCallback(
    async (id: string) => {
      await preload(floorImg(id));
      go({ piso: id });
    },
    [floorImg, go],
  );

  // la llegada: solo si se entra al edificio (no si se llega directo a un piso)
  const [introState, setIntro] = useState<'video' | 'done'>(() => (levelId ? 'done' : 'video'));
  const video = night ? orient?.night?.video : orient?.video;
  const intro = video ? introState : 'done';

  // el último piso abierto: hacia él se acerca el edificio al entrar y desde él se aleja al volver
  const [focus, setFocus] = useState<string | null>(levelId);
  if (levelId && levelId !== focus) setFocus(levelId);

  // en escritorio, ya terminada la llegada, las plantas se bajan en tiempo ocioso
  useEffect(() => {
    if (intro !== 'done' || !chrome?.desktop) return;
    const ids = data.levels.map((l) => l.id);
    let i = 0;
    let handle = 0;
    const next = () => {
      const id = ids[i++];
      if (!id) return;
      preload(floorImg(id)).then(() => {
        handle = window.setTimeout(next, 120);
      });
    };
    handle = window.setTimeout(next, 1200);
    return () => window.clearTimeout(handle);
  }, [intro, chrome?.desktop, data.levels, floorImg]);

  if (!chrome || !orient) return <div data-guided-view className="fixed inset-0" style={{ background: data.sky }} />;

  const building = fitBuilding(orient, chrome);
  const focusId = levelId ?? focus;
  const bandFocus = focusId ? orient.floors?.[focusId] : undefined;
  const origin = bandFocus
    ? (() => {
        const b = bbox(bandFocus);
        return `${building.left + ((b.x0 + b.x1) / 2) * building.w}px ${building.top + ((b.y0 + b.y1) / 2) * building.h}px`;
      })()
    : '50% 50%';
  const bg = level ? (night ? data.backgroundNight : data.background) : night ? data.skyNight : data.sky;
  // sobre la torre de día y las plantas de día, texto oscuro; de noche, claro
  const dark = !night;

  const toggleNight = () => {
    setNight(!night);
    if (intro === 'video') setIntro('done');
  };

  const controls = (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-ink/85 p-1 text-bone shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)] backdrop-blur-sm">
      <ModeSwitch slug={data.slug} current="guiado" place={{ level: levelId, unit: unit?.id }} />
      <LangSwitch className="hidden pl-1 md:flex" />
      {hasNight ? (
        <button
          type="button"
          onClick={toggleNight}
          aria-pressed={night}
          aria-label={night ? tr('Ver de día') : tr('Ver de noche')}
          className="grid size-9 place-items-center rounded-full transition-colors hover:bg-bone/15"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={night ? 'luna' : 'sol'}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.3 }}
            >
              {night ? <Moon aria-hidden className="size-4" strokeWidth={1.5} /> : <Sun aria-hidden className="size-4" strokeWidth={1.5} />}
            </motion.span>
          </AnimatePresence>
        </button>
      ) : null}
      <Link
        href={routes.hotel(data.slug)}
        aria-label={tr('Volver a la entrada')}
        className="grid size-9 place-items-center rounded-full transition-colors hover:bg-bone/15"
      >
        <X aria-hidden className="size-4" strokeWidth={1.5} />
      </Link>
    </div>
  );

  return (
    <div
      data-guided-view
      className="fixed inset-0 overflow-clip transition-[background-color] duration-700 ease-out"
      style={{ background: bg }}
    >
      {/* 1 · el edificio */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: origin }}
        initial={false}
        animate={level ? { scale: 1.65, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: level ? 0.75 : 0.85, ease: EASE }}
        aria-hidden={level ? true : undefined}
      >
        <Building
          data={data}
          orient={orient}
          box={building}
          chrome={chrome}
          intro={intro}
          video={video}
          night={night}
          active={!level}
          onIntroEnd={() => setIntro('done')}
          onReplay={() => setIntro('video')}
          onOpen={openLevel}
          onIntent={(id) => void preload(floorImg(id))}
          free={o}
        />
      </motion.div>

      {/* velo suave detrás de la marca y los controles: la ciudad de fondo es muy cargada */}
      <div
        aria-hidden
        className={cn('pointer-events-none absolute transition-opacity duration-700', level ? 'opacity-0' : 'opacity-100')}
        style={
          chrome.desktop
            ? {
                left: 0,
                bottom: 0,
                width: 720,
                height: 360,
                background: `radial-gradient(ellipse at 0% 100%, ${night ? 'rgb(20 20 22 / 0.75)' : 'rgb(244 241 234 / 0.85)'} 0%, transparent 70%)`,
              }
            : {
                left: 0,
                right: 0,
                top: 0,
                height: 150,
                background: `linear-gradient(to bottom, ${night ? 'rgb(20 20 22 / 0.7)' : 'rgb(244 241 234 / 0.8)'}, transparent)`,
              }
        }
      />

      {/* la marca del hotel: abajo a la izquierda en escritorio, arriba en el celular */}
      <AnimatePresence>
        {!level || chrome.desktop ? (
          <motion.div
            key="marca"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: level ? 0 : 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: level ? 0 : 0.2 }}
            className={cn('pointer-events-none absolute', chrome.desktop ? 'bottom-8 left-8 lg:left-12' : 'top-4 left-4')}
          >
            <p className={cn('eyebrow transition-colors duration-700', dark ? 'text-ink/65' : 'text-bone/70')}>
              {intro === 'video' || !chrome.desktop
                ? chrome.desktop
                  ? data.place
                  : tr('Vista guiada')
                : tr('Vista guiada · elige un piso')}
            </p>
            <p
              className={cn(
                'font-display leading-[0.9] transition-colors duration-700',
                dark ? 'text-ink' : 'text-bone',
                data.upper ? 'tracking-[0.16em] uppercase' : 'tracking-tight',
                chrome.desktop ? (data.upper ? 'mt-3 text-6xl' : 'mt-2 text-7xl') : data.upper ? 'mt-1.5 text-2xl' : 'mt-1 text-4xl',
              )}
            >
              {data.name}
            </p>
            {chrome.desktop ? (
              <p className={cn('mt-3 text-sm transition-colors duration-700', dark ? 'text-ink/70' : 'text-bone/75')}>{data.place}</p>
            ) : null}
            <p className={cn('mt-2 text-[0.6875rem] transition-colors duration-700', dark ? 'text-ink/55' : 'text-bone/55')}>{data.note}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 2 y 3 · el piso y la unidad */}
      <AnimatePresence>
        {level ? (
          <Floor
            key="piso"
            data={data}
            level={level}
            unit={unit}
            shot={floorShot(level.id)}
            night={night}
            chrome={chrome}
            offer={offer}
            go={go}
            floorImg={floorImg}
            hasShot={(id) => !!floorShot(id)}
          />
        ) : null}
      </AnimatePresence>

      {/* controles: idioma, día o noche, cerrar (en el celular, solo en el edificio: arriba va el piso) */}
      <AnimatePresence>
        {chrome.desktop || !level ? (
          <motion.div
            key="controles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute top-4 right-4 md:top-6 md:right-6"
          >
            {controls}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- 1 · edificio

function Building({
  data,
  orient,
  box,
  chrome,
  intro,
  video,
  night,
  active,
  onIntroEnd,
  onReplay,
  onOpen,
  onIntent,
  free,
}: {
  data: GuidedData;
  orient: GuidedOrient;
  box: Box;
  chrome: Chrome;
  intro: 'video' | 'done';
  video?: string;
  night: boolean;
  active: boolean;
  onIntroEnd: () => void;
  onReplay: () => void;
  onOpen: (id: string) => void;
  onIntent: (id: string) => void;
  free: ReturnType<typeof offerTexts>;
}) {
  const tr = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pressedId, setPressed] = useState<string | null>(null);
  const pressed = active ? pressedId : null;
  // el barrido de los pisos (de arriba hacia abajo) se repite cada vez que se vuelve al edificio
  const ready = active && intro === 'done';
  const [sweepState, setSweep] = useState({ ready, n: 0 });
  if (sweepState.ready !== ready) {
    setSweep({ ready, n: sweepState.n + (ready ? 1 : 0) });
    // al volver al edificio no queda encendido el piso de antes (Jacobo: "se queda trabado")
    setPressed(null);
    setHover(null);
  }
  const sweep = sweepState.n;

  // si el navegador no deja reproducir (ahorro de batería), se salta la llegada
  useEffect(() => {
    if (intro !== 'video') return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(onIntroEnd);
    const guard = window.setTimeout(() => {
      if (v.paused || v.readyState < 2) onIntroEnd();
    }, 5000);
    return () => window.clearTimeout(guard);
  }, [intro, onIntroEnd, video]);

  const playing = intro === 'video';
  // la ayuda se va sola: tapaba el primer piso
  const [hintGone, setHintGone] = useState(false);
  useEffect(() => {
    if (!ready || hintGone) return;
    const id = window.setTimeout(() => setHintGone(true), 4500);
    return () => window.clearTimeout(id);
  }, [ready, hintGone]);

  const bands = data.levels.filter((l) => orient.floors?.[l.id]);
  const showFloors = !playing && active;

  const summary = (l: GuidedLevel) => {
    if (!l.units.length) return l.pois.map((p) => p.name).join(' · ');
    const n = l.units.filter((id) => !data.units[id]?.occupied).length;
    return `${n} ${n === 1 ? free.free : free.freePlural}`;
  };
  const cover = box.h >= chrome.H - 1 && box.w >= chrome.W - 1;
  const mask =
    box.h < chrome.H - 1
      ? 'linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent)'
      : box.w < chrome.W - 1
        ? 'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)'
        : undefined;

  return (
    <>
      <div className="absolute" style={{ left: box.left, top: box.top, width: box.w, height: box.h }}>
        <DayNight day={orient.pisos} night={orient.night?.pisos} isNight={night} style={cover ? undefined : { maskImage: mask }} />
        {video ? (
          <motion.video
            key={video}
            ref={videoRef}
            src={video}
            muted
            playsInline
            preload="auto"
            onEnded={onIntroEnd}
            className="absolute inset-0 size-full"
            initial={false}
            animate={{ opacity: playing ? 1 : 0 }}
            transition={{ duration: playing ? 0.2 : 0.6 }}
            style={{ pointerEvents: 'none' }}
          />
        ) : null}

        {/* cada piso: se ilumina al pasar el mouse (o con el dedo) */}
        <svg
          viewBox={`0 0 ${orient.w} ${orient.h}`}
          preserveAspectRatio="none"
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-500',
            showFloors ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          role="group"
          aria-label={tr('Pisos')}
        >
          <defs>
            <linearGradient id="guiada-luz" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffe2b0" stopOpacity="0.15" />
              <stop offset="0.5" stopColor="#ffd28a" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffe2b0" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {bands.map((l, i) => {
            const on = hover === l.id || pressed === l.id;
            const d = toPath(orient.floors![l.id]!, orient.w, orient.h);
            return (
              <g key={l.id}>
                {/* barrido: cada piso se enciende un instante, de arriba hacia abajo */}
                <motion.path
                  key={`sweep-${sweep}`}
                  d={d}
                  fill="url(#guiada-luz)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.9, 0] }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.07, ease: 'easeInOut' }}
                  pointerEvents="none"
                />
                <path
                  d={d}
                  className="cursor-pointer transition-[fill-opacity,stroke-opacity] duration-300"
                  fill="url(#guiada-luz)"
                  fillOpacity={on ? 1 : 0}
                  stroke="#fff3dc"
                  strokeOpacity={on ? 0.95 : 0}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  onPointerEnter={() => {
                    setHover(l.id);
                    onIntent(l.id);
                  }}
                  onPointerLeave={() => setHover((h) => (h === l.id ? null : h))}
                  onPointerDown={() => onIntent(l.id)}
                  onClick={() => {
                    setPressed(l.id);
                    onOpen(l.id);
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* el número de cada piso, a la derecha de la torre */}
      <div className={cn('pointer-events-none absolute inset-0 transition-opacity duration-500', showFloors ? 'opacity-100' : 'opacity-0')}>
        {bands.map((l, i) => {
          const b = bbox(orient.floors![l.id]!);
          const y = box.top + ((b.y0 + b.y1) / 2) * box.h;
          const x = box.left + b.x1 * box.w;
          const on = hover === l.id || pressed === l.id;
          return (
            <motion.button
              key={`${l.id}-${sweep}`}
              type="button"
              tabIndex={showFloors ? 0 : -1}
              aria-label={`${l.name}: ${summary(l)}`}
              onPointerEnter={() => {
                setHover(l.id);
                onIntent(l.id);
              }}
              onPointerLeave={() => setHover((h) => (h === l.id ? null : h))}
              onFocus={() => setHover(l.id)}
              onBlur={() => setHover(null)}
              onClick={() => {
                setPressed(l.id);
                onOpen(l.id);
              }}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
              className={cn(
                'absolute flex -translate-y-1/2 items-center gap-2 pl-1.5 text-left',
                showFloors ? 'pointer-events-auto' : 'pointer-events-none',
              )}
              style={{ left: x + (chrome.desktop ? 10 : 4), top: y }}
            >
              <span
                aria-hidden
                className={cn('h-px transition-all duration-200', night ? 'bg-bone/50' : 'bg-ink/50', on ? 'w-6' : 'w-3')}
              />
              <span
                className={cn(
                  'grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[0.8125rem] font-medium tabular-nums shadow-sm transition-colors duration-200',
                  on ? 'bg-ink text-bone' : 'bg-background/90 text-ink',
                )}
              >
                {l.order}
              </span>
              {chrome.desktop ? (
                <span
                  className={cn(
                    'rounded-full bg-background/92 px-3 py-1 text-xs whitespace-nowrap text-ink shadow-sm transition-all duration-200',
                    on ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
                  )}
                >
                  <span className="font-medium">{l.name}</span>
                  <span className="text-muted-foreground"> · {summary(l)}</span>
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      {/* saltar la llegada, ayuda y repetir */}
      <div
        className={cn('pointer-events-none absolute inset-x-0 flex px-4', playing || chrome.desktop ? 'justify-center' : 'justify-start')}
        style={{ bottom: chrome.desktop ? 32 : chrome.H - chrome.barTop + 14 }}
      >
        <AnimatePresence mode="wait">
          {playing ? (
            <motion.button
              key="saltar"
              type="button"
              onClick={() => {
                videoRef.current?.pause();
                onIntroEnd();
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="pointer-events-auto inline-flex min-h-11 items-center rounded-full bg-ink/80 px-5 text-sm text-bone backdrop-blur-sm transition-colors hover:bg-ink"
            >
              {tr('Saltar')}
            </motion.button>
          ) : showFloors ? (
            <motion.div
              key="ayuda"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  'rounded-full bg-ink/80 px-4 py-2.5 text-sm text-bone backdrop-blur-sm transition-opacity duration-500 md:hidden',
                  hintGone && 'opacity-0',
                )}
              >
                {tr('Toca un piso para verlo')}
              </span>
              {video ? (
                <button
                  type="button"
                  onClick={onReplay}
                  aria-label={tr('Ver la llegada otra vez')}
                  className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-background/90 px-4 text-sm text-ink shadow-sm transition-colors hover:bg-background"
                >
                  <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
                  <span className="hidden md:inline">{tr('Ver la llegada otra vez')}</span>
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- 2 · piso

function Floor({
  data,
  level,
  unit,
  shot,
  night,
  chrome,
  offer,
  go,
  floorImg,
  hasShot,
}: {
  data: GuidedData;
  level: GuidedLevel;
  unit: GuidedUnit | null;
  shot: Shot | null;
  night: boolean;
  chrome: Chrome;
  offer?: Offer;
  go: (n: { piso?: string | null; u?: string | null }) => void;
  floorImg: (id: string) => string | undefined;
  hasShot: (id: string) => boolean;
}) {
  const tr = useT();
  const lang = useLang();
  const o = offerTexts(offer, lang);
  const [hover, setHover] = useState<string | null>(null);
  const [poi, setPoi] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetH, setSheetH] = useState(0);

  // el piso que se ve (cambia con una animación propia al subir o bajar)
  const idx = data.levels.findIndex((l) => l.id === level.id);
  const above = data.levels[idx - 1];
  const below = data.levels[idx + 1];
  const [seen, setSeen] = useState({ id: level.id, order: level.order, dir: 1 });
  if (seen.id !== level.id) {
    setSeen({ id: level.id, order: level.order, dir: level.order >= seen.order ? 1 : -1 });
    setPoi(null);
    setDrawn(false);
  }
  const dir = seen.dir;
  // al entrar, los contornos se dibujan en cadena y se apagan; después solo con el mouse o el dedo
  useEffect(() => {
    if (drawn) return;
    const id = window.setTimeout(() => setDrawn(true), 2600);
    return () => window.clearTimeout(id);
  }, [drawn, level.id]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return setSheetH(0);
    const ro = new ResizeObserver(() => setSheetH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [unit]);

  // área libre para la planta: sin la columna (o la ficha), los controles ni la reserva
  const area = chrome.desktop
    ? { l: unit ? 24 + 416 + 40 : 380, t: TOP, r: chrome.W - 32, b: chrome.H - 110 }
    : { l: 12, t: unit ? 16 : TOP + 4, r: chrome.W - 12, b: chrome.barTop - 16 - (unit ? sheetH : 64) };

  const base = useMemo(() => {
    if (!shot) return null;
    return fitRect(shot, padded(bbox(shot.spaces.flatMap((s) => s.poly))), area, 1.6);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo la planta y la pantalla
  }, [shot, chrome.W, chrome.H, chrome.barTop, chrome.desktop]);

  // con una unidad elegida, la planta se acerca a ella (por transformación: fluido)
  const target = useMemo(() => {
    if (!shot || !base) return null;
    const sp = unit ? shot.spaces.find((s) => s.id === unit.id) : undefined;
    const t = sp
      ? fitRect(shot, padded(bbox(sp.poly), 9), area, 1.3)
      : fitRect(shot, padded(bbox(shot.spaces.flatMap((s) => s.poly))), area, 1.6);
    return { k: t.s / base.s, x: t.left - base.left, y: t.top - base.top };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el área cambia con la ficha
  }, [shot, base, unit, area.l, area.t, area.r, area.b]);

  const spring: Transition = { type: 'spring', stiffness: 90, damping: 20, mass: 0.9 };
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const tiltY = useTransform(dragX, [-200, 200], [-9, 9]);
  const tiltX = useTransform(dragY, [-150, 150], [8, -8]);
  const freeCount = level.units.filter((id) => !data.units[id]?.occupied).length;
  const prices = level.units.map((id) => data.units[id]?.price).filter((p): p is number => p !== undefined);
  const poiInfo = poi ? level.pois.find((p) => p.id === poi) : undefined;
  const pick = (id: string, isUnit: boolean) => (isUnit ? go({ piso: level.id, u: id }) : setPoi((p) => (p === id ? null : id)));
  const fg = night ? 'text-bone' : 'text-ink';
  const fgSoft = night ? 'text-bone/70' : 'text-ink/70';

  const list = level.units.length ? (
    <ul aria-label={tr('Unidades del piso')} className={cn('flex gap-2', chrome.desktop ? 'flex-col' : '')}>
      {level.units.map((id) => {
        const u = data.units[id];
        if (!u) return null;
        const on = hover === id;
        return (
          <li key={id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => pick(id, true)}
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover((h) => (h === id ? null : h))}
              className={cn(
                'flex min-h-11 w-full items-center gap-2.5 rounded-full px-4 text-left text-sm whitespace-nowrap shadow-sm transition-colors duration-200',
                on ? 'bg-ink text-bone' : 'bg-background/92 text-ink',
              )}
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: u.occupied ? TAKEN : FREE }} />
              <span className="font-medium tabular-nums">{u.id}</span>
              {chrome.desktop && u.category ? (
                <span className={cn('min-w-0 truncate text-xs', on ? 'text-bone/70' : 'text-ink/55')}>{u.category}</span>
              ) : null}
              <span className={cn('ml-auto pl-2 text-xs tabular-nums', on ? 'text-bone/80' : 'text-ink/65')}>
                {u.occupied ? o.takenShort : u.price !== undefined ? formatPrice(u.price, offer, lang) : ''}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, rotate: 5, transition: { duration: 0.5, ease: EASE } }}
    >
      {/* la planta: entra girando y se asienta */}
      <div className="absolute inset-0" style={{ perspective: 1600 }}>
        <AnimatePresence initial custom={dir}>
          {shot && base && target ? (
            <motion.div
              key={level.id}
              custom={dir}
              className="absolute"
              style={{ left: base.left, top: base.top, width: base.w, height: base.h, transformOrigin: `${base.w / 2}px ${base.h / 2}px` }}
              variants={{
                enter: (d: number) => ({ opacity: 0, rotateX: 32, rotateZ: -14 * d, scale: 0.74, y: 70 * d }),
                show: {
                  opacity: 1,
                  rotateX: 0,
                  rotateZ: 0,
                  scale: 1,
                  y: 0,
                  transition: { ...spring, delay: 0.18, opacity: { duration: 0.5, delay: 0.18 } },
                },
                leave: (d: number) => ({ opacity: 0, rotateZ: 8 * d, scale: 0.86, y: -60 * d, transition: { duration: 0.45, ease: EASE } }),
              }}
              initial="enter"
              animate="show"
              exit="leave"
            >
              {/* se puede arrastrar: se inclina hacia donde se lleva y vuelve sola a su sitio (Jacobo) */}
              <motion.div
                className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
                drag
                dragSnapToOrigin
                dragElastic={0.18}
                dragConstraints={{ left: -140, right: 140, top: -90, bottom: 90 }}
                dragTransition={{ bounceStiffness: 180, bounceDamping: 16 }}
                style={{ x: dragX, y: dragY, rotateX: tiltX, rotateY: tiltY, transformPerspective: 1400 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ transformOrigin: '0 0' }}
                  initial={false}
                  animate={{ x: target.x, y: target.y, scale: target.k }}
                  transition={spring}
                >
                  <DayNight day={shot.img} night={shot.night} isNight={night} />
                  <svg viewBox={`0 0 ${shot.w} ${shot.h}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
                    <defs>
                      {/* la luz cálida del 3D (Jacobo: "en el original es como un brillo"): fuerte al centro, se pierde en los bordes */}
                      {/* con el color del estado: verde libre, terracota ocupada; cálida en los lugares comunes */}
                      {(
                        [
                          ['comun', '#ffd59a', '#ffc979'],
                          ['libre', '#bfe0a6', '#6f9a58'],
                          ['ocupada', '#f2b49c', '#b0573a'],
                        ] as const
                      ).map(([id, center, edge]) => (
                        <radialGradient key={id} id={`guiada-brillo-${id}`} cx="0.5" cy="0.5" r="0.62">
                          <stop offset="0" stopColor={center} stopOpacity="0.85" />
                          <stop offset="0.55" stopColor={edge} stopOpacity="0.45" />
                          <stop offset="1" stopColor={edge} stopOpacity="0" />
                        </radialGradient>
                      ))}
                    </defs>
                    {shot.spaces.map((s, i) => {
                      const u = s.kind === 'unit' ? data.units[s.id] : undefined;
                      // solo se enciende al pasar, al elegir o en el barrido de entrada; sin recuadro
                      const on = hover === s.id || unit?.id === s.id || poi === s.id;
                      const strong = unit?.id === s.id;
                      return (
                        <motion.path
                          key={s.id}
                          d={toPath(s.poly, shot.w, shot.h)}
                          fill={`url(#guiada-brillo-${u ? (u.occupied ? 'ocupada' : 'libre') : 'comun'})`}
                          className="cursor-pointer"
                          style={{ mixBlendMode: night ? 'screen' : 'normal' }}
                          initial={{ opacity: 0 }}
                          animate={drawn ? { opacity: strong ? 1 : on ? 0.85 : 0 } : { opacity: [0, 0.75, 0] }}
                          transition={
                            drawn ? { duration: 0.35, ease: 'easeOut' } : { duration: 1.1, delay: 0.6 + i * 0.08, ease: 'easeInOut' }
                          }
                          onPointerEnter={() => setHover(s.id)}
                          onPointerLeave={() => setHover((h) => (h === s.id ? null : h))}
                          onClick={() => pick(s.id, !!u)}
                        />
                      );
                    })}
                  </svg>
                  {/* etiquetas: tamaño fijo aunque la planta se acerque */}
                  {shot.spaces.map((s, i) => {
                    const u = s.kind === 'unit' ? data.units[s.id] : undefined;
                    const name = u ? u.id : level.pois.find((p) => p.id === s.id)?.name;
                    if (!name) return null;
                    const [lx, ly] = polygonLabelPoint(s.poly);
                    const on = hover === s.id || unit?.id === s.id || poi === s.id;
                    const dim = unit && unit.id !== s.id;
                    return (
                      <motion.button
                        key={s.id}
                        type="button"
                        aria-label={u ? `${u.name}, ${u.occupied ? o.taken : o.free}` : name}
                        aria-pressed={unit?.id === s.id || poi === s.id}
                        onPointerEnter={() => setHover(s.id)}
                        onPointerLeave={() => setHover((h) => (h === s.id ? null : h))}
                        onClick={() => pick(s.id, !!u)}
                        className={cn(
                          'absolute flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-xs font-medium whitespace-nowrap shadow-sm transition-colors duration-200',
                          on ? 'bg-ink text-bone' : 'bg-background/92 text-ink',
                        )}
                        style={{ left: `${lx * 100}%`, top: `${ly * 100}%`, x: '-50%', y: '-50%', transformOrigin: '50% 50%' }}
                        initial={{ opacity: 0, scale: 0.6 / target.k }}
                        animate={{ opacity: dim ? 0.35 : 1, scale: 1 / target.k }}
                        transition={{ opacity: { duration: 0.35, delay: drawn ? 0 : 0.9 + i * 0.06 }, scale: spring }}
                      >
                        {u ? <span aria-hidden className="size-2 rounded-full" style={{ background: u.occupied ? TAKEN : FREE }} /> : null}
                        {name}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* el piso: nombre, resumen, subir y bajar, y la lista (en escritorio, una columna) */}
      <AnimatePresence>
        {!unit ? (
          <motion.div
            key="cabeza"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
            className={cn(
              'absolute',
              chrome.desktop ? 'top-6 bottom-8 left-8 flex w-80 flex-col lg:left-12' : 'inset-x-3 top-3 flex items-center gap-2',
            )}
          >
            <div className={cn(chrome.desktop ? '' : 'contents')}>
              <button
                type="button"
                onClick={() => go({})}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-background/90 text-sm text-ink shadow-sm transition-colors hover:bg-background',
                  chrome.desktop ? 'px-4' : 'w-11 justify-center',
                )}
                aria-label={tr('Volver al edificio')}
              >
                <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />
                {chrome.desktop ? tr('Edificio') : null}
              </button>
            </div>
            <div className={cn('min-w-0', chrome.desktop ? 'mt-6' : 'flex-1')}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 10 * dir }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 * dir }}
                  transition={{ duration: 0.3 }}
                >
                  {chrome.desktop ? (
                    <p className={cn('eyebrow transition-colors duration-700', night ? 'text-bone/60' : 'text-ink/60')}>{data.name}</p>
                  ) : null}
                  <h1
                    className={cn(
                      'font-display leading-none transition-colors duration-700',
                      fg,
                      chrome.desktop ? 'mt-2 text-5xl' : 'truncate text-2xl',
                    )}
                  >
                    {level.name}
                  </h1>
                  <p className={cn('transition-colors duration-700', fgSoft, chrome.desktop ? 'mt-3 text-sm' : 'truncate text-xs')}>
                    {level.units.length
                      ? [
                          tr('{n} de {t} {x}', { n: freeCount, t: level.units.length, x: freeCount === 1 ? o.free : o.freePlural }),
                          prices.length ? tr('Desde {p}', { p: formatPrice(Math.min(...prices), offer, lang) }) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : level.pois.map((p) => p.name).join(' · ')}
                  </p>
                  {!chrome.desktop ? (
                    <p className={cn('truncate text-[0.625rem]', night ? 'text-bone/50' : 'text-ink/50')}>{data.note}</p>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
            {/* subir y bajar de piso */}
            <div className={cn('flex shrink-0 gap-1.5', chrome.desktop ? 'mt-5' : '')}>
              {[
                { l: above, icon: ChevronUp, label: tr('Piso de arriba') },
                { l: below, icon: ChevronDown, label: tr('Piso de abajo') },
              ].map(({ l, icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  disabled={!l || !hasShot(l.id)}
                  onClick={() => l && go({ piso: l.id })}
                  onPointerEnter={() => l && void preload(floorImg(l.id))}
                  aria-label={l ? `${label}: ${l.name}` : label}
                  className="grid size-11 place-items-center rounded-full bg-background/90 text-ink shadow-sm transition-colors hover:bg-background disabled:opacity-35"
                >
                  <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                </button>
              ))}
            </div>
            {chrome.desktop ? (
              <>
                {level.units.length ? (
                  <p className={cn('mt-6 flex gap-4 text-xs transition-colors duration-700', fgSoft)}>
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: FREE }} />
                      {tr('Libre')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: TAKEN }} />
                      {o.takenShort}
                    </span>
                  </p>
                ) : (
                  <p className={cn('mt-6 text-sm text-pretty transition-colors duration-700', fgSoft)}>
                    {tr('Toca un lugar para saber qué es.')}
                  </p>
                )}
                {/* la lista ocupa lo que quede de alto y se desplaza si no cabe */}
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1 [scrollbar-width:thin]">{list}</div>
                <p className={cn('mt-3 text-[0.6875rem] transition-colors duration-700', night ? 'text-bone/50' : 'text-ink/50')}>
                  {data.note}
                </p>
              </>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* en el celular, la lista va abajo, en una franja que se desliza */}
      <AnimatePresence>
        {!chrome.desktop && !unit && list ? (
          <motion.div
            key={`lista-${level.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45, delay: 0.7 }}
            className="absolute inset-x-0 snap-x overflow-x-auto px-3 pb-1 [scrollbar-width:none]"
            style={{ bottom: chrome.H - chrome.barTop + 12 }}
          >
            {list}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* un lugar común: qué es */}
      <AnimatePresence>
        {poiInfo && !unit ? (
          <motion.div
            key={poiInfo.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-x-3 rounded-2xl bg-background p-4 shadow-lg md:right-auto md:left-[25rem] md:w-80"
            style={{ bottom: chrome.desktop ? 32 : chrome.H - chrome.barTop + 12 }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-xl leading-tight">{poiInfo.name}</p>
              <button
                type="button"
                onClick={() => setPoi(null)}
                aria-label={tr('Cerrar')}
                className="-m-2 grid size-10 place-items-center text-ink/70 hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            {poiInfo.description ? <p className="mt-1.5 text-sm text-pretty text-ink/75">{poiInfo.description}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 3 · la unidad */}
      <AnimatePresence>
        {unit ? (
          <motion.div
            key="ficha"
            ref={sheetRef}
            initial={chrome.desktop ? { opacity: 0, x: -24 } : { y: '100%' }}
            animate={chrome.desktop ? { opacity: 1, x: 0 } : { y: 0 }}
            exit={
              chrome.desktop
                ? { opacity: 0, x: -24, transition: { duration: 0.25 } }
                : { y: '100%', transition: { duration: 0.3, ease: EASE } }
            }
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className={cn(
              'absolute overflow-y-auto overscroll-contain bg-background shadow-[0_24px_60px_-28px_rgb(28_27_25/0.5)]',
              chrome.desktop
                ? 'top-6 bottom-6 left-6 w-[26rem] rounded-[var(--hotel-r-card,6px)]'
                : 'inset-x-0 max-h-[56dvh] rounded-t-2xl',
            )}
            style={chrome.desktop ? undefined : { bottom: chrome.H - chrome.barTop }}
          >
            <UnitPanel key={unit.id} data={data} unit={unit} offer={offer} onClose={() => go({ piso: level.id })} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------- 3 · unidad

function UnitPanel({ data, unit, offer, onClose }: { data: GuidedData; unit: GuidedUnit; offer?: Offer; onClose: () => void }) {
  const tr = useT();
  const lang = useLang();
  const routes = useRoutes();
  const o = offerTexts(offer, lang);
  const plan = unit.plan ? data.plans[unit.plan] : undefined;
  const first = plan?.spaces.find((s) => s.photos.length || s.pano) ?? plan?.spaces[0];
  const [spaceId, setSpaceId] = useState(first?.id ?? null);
  const space = plan?.spaces.find((s) => s.id === spaceId);

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {unit.category ? <p className="eyebrow text-muted-foreground">{unit.category}</p> : null}
          <h2 className="mt-1.5 font-display text-3xl leading-none">{unit.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Cerrar')}
          className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center text-ink/70 hover:text-ink"
        >
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: unit.occupied ? TAKEN : FREE }}>
          <span aria-hidden className="size-2 rounded-full" style={{ background: unit.occupied ? TAKEN : FREE }} />
          {unit.occupied ? o.taken : tr('Libre en estas fechas')}
        </span>
        {unit.price !== undefined ? <span className="text-ink/80">{formatPrice(unit.price, offer, lang)}</span> : null}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {[formatArea(unit.areaM2), pluralize(unit.capacity, tr('persona'), tr('personas')), unit.beds].filter(Boolean).join(' · ')}
      </p>
      {unit.view ? <p className="mt-2 text-sm text-pretty text-ink/80">{unit.view}</p> : null}

      {plan ? (
        <div className="mt-5 rounded-2xl border border-border bg-secondary p-3">
          <PlanSvg
            geometry={plan.geometry}
            spaces={plan.spaces.map((s) => ({
              id: s.id,
              name: s.name,
              areaM2: s.areaM2,
              href: routes.espacio(data.slug, unit.id, s.id),
              outdoor: s.outdoor,
            }))}
            selectedId={spaceId ?? undefined}
            onPick={setSpaceId}
            title={tr('Plano de {x}, {a}', { x: unit.name, a: formatArea(unit.areaM2) })}
            className="mx-auto max-w-[17rem] md:max-w-sm"
          />
        </div>
      ) : null}

      {space ? (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-xl">{space.name}</p>
            {space.areaM2 ? <p className="text-xs text-muted-foreground">{formatArea(space.areaM2)}</p> : null}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={space.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {space.photos.length ? <Gallery items={space.photos} title={space.name} className="mt-3" /> : null}
              {space.pano ? (
                <PanoButton url={space.pano.url} yaw={space.pano.yaw} title={space.name} className="mt-3 w-full justify-center" />
              ) : null}
              {!space.photos.length && !space.pano ? (
                <p className="mt-2 text-sm text-muted-foreground">{tr('Aún no hay fotos de este espacio.')}</p>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : null}

      <Link
        href={routes.unidad(data.slug, unit.id)}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--hotel-r-btn,3px)] border border-border text-sm transition-colors hover:border-ink/40 hover:bg-card"
      >
        <Move3d aria-hidden className="size-4" strokeWidth={1.5} />
        {tr('Ver en modo libre')}
      </Link>
    </div>
  );
}
