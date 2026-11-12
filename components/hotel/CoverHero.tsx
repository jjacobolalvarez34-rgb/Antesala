'use client';

/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { lessMotion } from '@/lib/motion';

export interface CoverHeroPoint {
  id: string;
  label: string;
  detail?: string;
  /** fracción de la imagen (0 a 1) */
  x: number;
  y: number;
  href: Route;
  clip?: { sm: string; lg?: string; poster?: string };
}

interface Layout {
  /** object-position vertical (0 a 1) que deja ver todos los puntos */
  posY: number;
  pins: { id: string; left: number; top: number; inside: boolean }[];
}

/**
 * Portada con puntos tocables (bloque 9, D-060). La foto se recorta como
 * object-fit: cover; el encuadre vertical se elige para que quepan los puntos,
 * y cada punto se ubica con la misma cuenta. En celular el texto de la portada
 * tapa la parte de abajo: ahí los puntos van como una fila de botones.
 * Al tocar uno con video, pasa el clip a pantalla completa y luego entra;
 * con ahorro de datos o en modo ligero entra directo.
 */
export function CoverHero({
  src,
  alt,
  width,
  height,
  points,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  points: CoverHeroPoint[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [playing, setPlaying] = useState<CoverHeroPoint | null>(null);
  const [wide, setWide] = useState(true);

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const W = el.clientWidth;
    const H = el.clientHeight;
    const scale = Math.max(W / width, H / height);
    const dw = width * scale;
    const dh = height * scale;
    const margin = 56;
    // abajo queda la barra de reserva fija: más aire
    const marginBottom = 120;
    // encuadre vertical: el rango de offsets que deja todos los puntos adentro
    let posY = 0.5;
    if (dh > H && points.length) {
      // offset = cuánto se corre la imagen (≤ 0). Un punto y queda adentro si
      // margin ≤ off + y ≤ H - marginBottom. Si no caben todos, se sueltan los de
      // más abajo: lo de arriba (la terraza) manda; los sueltos quedan como botones.
      let ys = points.map((p) => p.y * dh).sort((a, b) => a - b);
      const lo = margin - ys[0]!;
      while (ys.length > 1 && lo > H - marginBottom - ys[ys.length - 1]!) ys = ys.slice(0, -1);
      const hi = H - marginBottom - ys[ys.length - 1]!;
      const center = (H - dh) / 2;
      const off = Math.min(0, Math.max(H - dh, lo <= hi ? Math.min(hi, Math.max(lo, center)) : lo));
      posY = off / (H - dh);
    }
    const offX = (W - dw) / 2;
    const offY = (H - dh) * posY;
    setLayout({
      posY,
      pins: points.map((p) => {
        const left = offX + p.x * dw;
        const top = offY + p.y * dh;
        return { id: p.id, left, top, inside: left > 16 && left < W - 16 && top > 16 && top < H - 96 };
      }),
    });
    setWide(window.innerWidth >= 768);
  }, [points, width, height]);

  useLayoutEffect(() => {
    measure();
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const go = (p: CoverHeroPoint) => {
    router.prefetch(p.href);
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (!p.clip || nav.connection?.saveData || lessMotion()) {
      router.push(p.href);
      return;
    }
    setPlaying(p);
  };

  return (
    <>
      <div ref={box} aria-hidden className="absolute inset-0 -z-10">
        <img
          src={src}
          alt=""
          width={width}
          height={height}
          fetchPriority="high"
          className="size-full object-cover"
          style={{ objectPosition: `50% ${((layout?.posY ?? 0.5) * 100).toFixed(1)}%` }}
        />
      </div>
      <span className="sr-only">{alt}</span>

      {/* escritorio: puntos sobre el edificio */}
      {layout && wide ? (
        <ul aria-label="Lugares del edificio" className="pointer-events-none absolute inset-0 z-10">
          {points.map((p) => {
            const pin = layout.pins.find((x) => x.id === p.id);
            if (!pin?.inside) return null;
            return (
              <li key={p.id} className="absolute" style={{ left: pin.left, top: pin.top }}>
                <button
                  type="button"
                  onClick={() => go(p)}
                  onPointerEnter={() => router.prefetch(p.href)}
                  className="group pointer-events-auto relative flex -translate-x-[18px] -translate-y-1/2 items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 text-left text-bone transition-colors hover:bg-ink/55 focus-visible:bg-ink/55"
                >
                  <span className="relative grid size-6 shrink-0 place-items-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-bone/40" />
                    <span className="size-3 rounded-full bg-bone shadow-[0_0_0_4px_rgb(244_241_234/0.25)]" />
                  </span>
                  <span className="flex flex-col leading-tight [text-shadow:0_1px_12px_rgb(0_0_0/0.6)]">
                    <span className="text-sm font-medium">{p.label}</span>
                    {p.detail ? <span className="text-xs text-bone/75">{p.detail}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* escritorio: los que no caben en el encuadre quedan como botones arriba */}
      {layout && wide && layout.pins.some((p) => !p.inside) ? (
        <div className="absolute top-16 left-6 z-10 flex flex-wrap gap-2" role="group" aria-label="Más lugares del edificio">
          {points
            .filter((p) => !layout.pins.find((x) => x.id === p.id)?.inside)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(p)}
                className="glass-dark inline-flex min-h-10 items-center gap-2 rounded-full pr-3.5 pl-2.5 text-[0.8125rem] font-medium text-bone"
              >
                <span className="size-2 rounded-full bg-bone" />
                {p.label}
              </button>
            ))}
        </div>
      ) : null}

      {/* celular: fila de botones arriba (el texto de la portada tapa la parte de abajo) */}
      {layout && !wide ? (
        <div className="absolute inset-x-4 top-14 z-10 flex flex-wrap gap-2" role="group" aria-label="Lugares del edificio">
          {points.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => go(p)}
              className="glass-dark inline-flex min-h-10 items-center gap-2 rounded-full pr-3.5 pl-2.5 text-[0.8125rem] font-medium text-bone"
            >
              <span className="size-2 rounded-full bg-bone" />
              {p.label}
            </button>
          ))}
        </div>
      ) : null}

      {playing ? <ClipOverlay point={playing} wide={wide} onDone={() => router.push(playing.href)} /> : null}
    </>
  );
}

/** Video de transición a pantalla completa; al terminar (o al saltar) entra al destino. */
function ClipOverlay({ point, wide, onDone }: { point: CoverHeroPoint; wide: boolean; onDone: () => void }) {
  const [on, setOn] = useState(false);
  const done = useRef(false);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true));
    const k = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    document.addEventListener('keydown', k);
    // si el video no arranca, no dejar a nadie esperando
    const guard = window.setTimeout(finish, 12_000);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', k);
      window.clearTimeout(guard);
    };
  }, [finish]);
  const src = wide ? (point.clip!.lg ?? point.clip!.sm) : point.clip!.sm;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Entrando: ${point.label}`}
      className={`fixed inset-0 z-[60] bg-black transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-0'}`}
    >
      <video
        className="size-full object-cover"
        src={src}
        poster={point.clip!.poster}
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pt-24 pb-[calc(2rem+var(--safe-bottom))] text-bone md:px-12">
        <p className="text-xs tracking-[0.2em] text-bone/70 uppercase">Entrando</p>
        <p className="mt-2 font-display text-4xl md:text-5xl">{point.label}</p>
        <p className="mt-2 text-xs text-bone/60">Video ilustrativo</p>
      </div>
      <button
        type="button"
        onClick={finish}
        autoFocus
        className="absolute right-5 bottom-[calc(1.5rem+var(--safe-bottom))] inline-flex min-h-11 items-center rounded-full border border-bone/30 px-5 text-sm text-bone transition-colors hover:bg-bone/10"
      >
        Saltar
      </button>
    </div>
  );
}
