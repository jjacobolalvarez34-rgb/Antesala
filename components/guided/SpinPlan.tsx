'use client';

/* eslint-disable @next/next/no-img-element -- tomas prerenderizadas a la medida; next/image no aplica */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { GuidedSpin, GuidedUnit, P2 } from '@/lib/guided-types';
import { polygonLabelPoint } from '@/lib/plan';
import { cn } from '@/lib/utils';

const FREE = '#4d6b3c';
const TAKEN = '#9a4a33';

/**
 * La planta de un piso en 3D (opcional, Jacobo 2026-11-27): fotos de la misma planta desde varios
 * ángulos alrededor; arrastrar de lado a lado cambia la foto y la planta gira como un objeto. Las
 * habitaciones se encienden y se tocan igual que en la planta 2D (sus contornos van por ángulo).
 */
export function SpinPlan({
  spin,
  area,
  units,
  poiNames,
  selected,
  onPick,
}: {
  spin: GuidedSpin;
  area: { l: number; t: number; r: number; b: number };
  units: Record<string, GuidedUnit>;
  poiNames: Record<string, string>;
  selected: string | null;
  onPick: (id: string, isUnit: boolean) => void;
}) {
  const n = spin.frames.length;
  const [k, setK] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; k: number; moved: boolean } | null>(null);

  // todas las fotos se bajan al abrir el 3D (solo entonces: el 2D sigue siendo el liviano)
  useEffect(() => {
    for (const f of spin.frames) {
      const img = new Image();
      img.src = f.img;
    }
  }, [spin]);

  // un mismo encuadre para todos los ángulos (la planta no cambia de tamaño al girar)
  const box = useMemo(() => {
    let x0 = 1;
    let y0 = 1;
    let x1 = 0;
    let y1 = 0;
    for (const f of spin.frames)
      for (const s of f.spaces)
        for (const [x, y] of s.poly) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    const pad = 0.06;
    const bw = (x1 - x0 + pad * 2) * spin.w;
    const bh = (y1 - y0 + pad * 2.5) * spin.h;
    const s = Math.min((area.r - area.l) / bw, (area.b - area.t) / bh, 1.8);
    const w = spin.w * s;
    const h = spin.h * s;
    return { w, h, left: (area.l + area.r) / 2 - ((x0 + x1) / 2) * w, top: (area.t + area.b) / 2 - ((y0 + y1) / 2) * h };
  }, [spin, area.l, area.t, area.r, area.b]);

  const frame = spin.frames[((k % n) + n) % n]!;
  const toPath = (poly: P2[]) => `M${poly.map(([x, y]) => `${(x * spin.w).toFixed(1)} ${(y * spin.h).toFixed(1)}`).join('L')}Z`;

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, k, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 6) d.moved = true;
        // ~28 px por ángulo: una vuelta completa en un arrastre largo
        setK(d.k - Math.round(dx / 28));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      <div className="absolute" style={{ left: box.left, top: box.top, width: box.w, height: box.h }}>
        <img src={frame.img} alt="" draggable={false} className="absolute inset-0 size-full select-none" />
        <svg viewBox={`0 0 ${spin.w} ${spin.h}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          {frame.spaces.map((s) => {
            const u = s.kind === 'unit' ? units[s.id] : undefined;
            const on = hover === s.id || selected === s.id;
            const color = u ? (u.occupied ? TAKEN : FREE) : '#d9a35b';
            return (
              <path
                key={s.id}
                d={toPath(s.poly)}
                fill={color}
                fillOpacity={on ? 0.32 : 0}
                stroke={color}
                strokeOpacity={on ? 0.9 : 0}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer transition-[fill-opacity,stroke-opacity] duration-200"
                onPointerEnter={() => setHover(s.id)}
                onPointerLeave={() => setHover((h) => (h === s.id ? null : h))}
                onClick={() => !drag.current?.moved && onPick(s.id, !!u)}
              />
            );
          })}
        </svg>
        {frame.spaces.map((s) => {
          const u = s.kind === 'unit' ? units[s.id] : undefined;
          const name = u ? u.id : poiNames[s.id];
          if (!name) return null;
          const [lx, ly] = polygonLabelPoint(s.poly);
          const on = hover === s.id || selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id, !!u)}
              onPointerEnter={() => setHover(s.id)}
              onPointerLeave={() => setHover((h) => (h === s.id ? null : h))}
              className={cn(
                'absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-xs font-medium whitespace-nowrap shadow-sm transition-colors duration-200',
                on ? 'bg-ink text-bone' : 'bg-background/92 text-ink',
              )}
              style={{ left: `${lx * 100}%`, top: `${ly * 100}%` }}
            >
              {u ? <span aria-hidden className="size-2 rounded-full" style={{ background: u.occupied ? TAKEN : FREE }} /> : null}
              {name}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
