'use client';

import { useThree, useFrame } from '@react-three/fiber';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type RefObject } from 'react';
import * as THREE from 'three';

import { formatCOP } from '@/lib/hotel';
import { useT } from '@/components/i18n/Lang';
import { cn } from '@/lib/utils';

import type { TerrainCabin } from './types';

export type LabelAnchors = RefObject<Map<string, HTMLElement>>;

/**
 * Dentro del Canvas: lleva cada letrero a su punto (la punta del techo). El letrero cuelga
 * de una línea fina: se ancla por abajo. Lejos o fuera de cuadro, se oculta; un poco más
 * transparente cuanto más lejos, para que la vista general no se llene de texto.
 */
export function LabelProjector({ points, anchors, below = false }: { points: { id: string; position: [number, number, number] }[]; anchors: LabelAnchors; below?: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3());
  useFrame(() => {
    for (const p of points) {
      const el = anchors.current.get(p.id);
      if (!el) continue;
      v.current.set(...p.position);
      const dist = camera.position.distanceTo(v.current);
      v.current.project(camera);
      const hidden = v.current.z > 1 || Math.abs(v.current.x) > 1.05 || Math.abs(v.current.y) > 1.1;
      el.style.visibility = hidden ? 'hidden' : 'visible';
      const x = ((v.current.x + 1) / 2) * size.width;
      const y = ((1 - v.current.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${below ? '-50%' : '-100%'})`;
      el.style.opacity = String(Math.max(0.45, Math.min(1, 1.25 - dist / 520)));
    }
  });
  return null;
}

/**
 * Letreros de los refugios (pedido de Jacobo, 2026-11-15): delgados, colgados de una línea
 * fina que baja hasta el techo. Bajo el puntero se abren con el precio y la capacidad; un
 * toque en el celular los abre y el segundo entra (como las habitaciones del piso).
 */
export function CabinLabels({
  cabins,
  anchors,
  visible,
  hovered,
  onHover,
  offer = 'noche',
}: {
  cabins: TerrainCabin[];
  anchors: LabelAnchors;
  visible: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
  offer?: string;
}) {
  const router = useRouter();
  const tr = useT();
  const touch = useRef(false);
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700', visible ? 'opacity-100' : 'opacity-0')}>
      <ul aria-label={tr('Refugios')}>
        {cabins.map((c) => {
          const active = hovered === c.id;
          return (
            <li
              key={c.id}
              ref={(el) => {
                if (el) anchors.current.set(c.id, el);
                else anchors.current.delete(c.id);
              }}
              className={cn('absolute top-0 left-0', visible && 'pointer-events-auto')}
              style={{ visibility: 'hidden', zIndex: active ? 2 : 1 }}
            >
              <Link
                href={c.href}
                tabIndex={visible ? 0 : -1}
                onPointerDown={(e) => {
                  touch.current = e.pointerType === 'touch';
                }}
                onClick={(e) => {
                  // en pantallas táctiles, el primer toque abre el letrero y el segundo entra
                  if (touch.current && !active) {
                    e.preventDefault();
                    onHover(c.id);
                    return;
                  }
                  e.preventDefault();
                  router.push(c.href);
                }}
                onPointerEnter={(e) => e.pointerType !== 'touch' && onHover(c.id)}
                onPointerLeave={(e) => e.pointerType !== 'touch' && onHover(null)}
                onFocus={() => onHover(c.id)}
                onBlur={() => onHover(null)}
                className="group flex flex-col items-center outline-none"
                aria-label={`${c.name}${c.price ? tr(', desde {p} por {o}', { p: formatCOP(c.price), o: tr(offer) }) : ''}${c.occupied ? tr(', ocupado en estas fechas') : ''}`}
              >
                <span
                  className={cn(
                    'flex flex-col items-center rounded-[3px] border px-3 py-1.5 text-center whitespace-nowrap transition-[background-color,border-color,color,padding] duration-300',
                    active ? 'border-bone bg-bone text-ink' : 'border-bone/45 bg-ink/45 text-bone backdrop-blur-[2px]',
                  )}
                >
                  <span className="font-display text-[0.95rem] leading-tight md:text-[1.05rem]">{c.name}</span>
                  <span
                    className={cn(
                      'grid text-[0.625rem] tracking-[0.16em] uppercase transition-[grid-template-rows,opacity] duration-300',
                      active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <span className="overflow-hidden">
                      <span className="block pt-1">
                        {c.price ? `${formatCOP(c.price)} / ${tr(offer)}` : c.category}
                        {` · ${c.capacity} ${tr('pers.')}`}
                      </span>
                      <span className="block pt-0.5 normal-case tracking-normal text-[0.6875rem] opacity-75">
                        {tr(c.occupied ? 'Ocupado en estas fechas' : 'Toca para entrar')}
                      </span>
                    </span>
                  </span>
                </span>
                {/* la línea fina hasta el techo */}
                <span
                  aria-hidden
                  className={cn('block w-px transition-[height,background-color] duration-300', active ? 'h-16 bg-bone' : 'h-12 bg-bone/60')}
                />
                <span aria-hidden className={cn('block size-1.5 rounded-full', c.occupied ? 'bg-bone/50' : 'bg-bone')} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Zonas comunes del terreno: solo el nombre, en pequeño, con una línea corta. */
export function PoiLabels({
  pois,
  anchors,
  visible,
}: {
  pois: { id: string; name: string; description?: string }[];
  anchors: LabelAnchors;
  visible: boolean;
}) {
  const tr = useT();
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700', visible ? 'opacity-100' : 'opacity-0')}>
      <ul aria-label={tr('Zonas comunes')}>
        {pois.map((p) => (
          <li
            key={p.id}
            ref={(el) => {
              if (el) anchors.current.set(p.id, el);
              else anchors.current.delete(p.id);
            }}
            className={cn('group absolute top-0 left-0', visible && 'pointer-events-auto')}
            style={{ visibility: 'hidden' }}
          >
            <span className="flex flex-col items-center" title={p.description}>
              <span className="text-[0.625rem] font-medium tracking-[0.22em] whitespace-nowrap text-bone uppercase [text-shadow:0_1px_6px_rgb(0_0_0/0.55)]">
                {p.name}
              </span>
              <span aria-hidden className="mt-1 block h-5 w-px bg-bone/50" />
              <span aria-hidden className="block size-1 rounded-full bg-bone/80" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
