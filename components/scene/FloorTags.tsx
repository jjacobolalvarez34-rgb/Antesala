'use client';

import { useFrame, useThree } from '@react-three/fiber';
import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useT } from '@/components/i18n/Lang';

export interface FloorTag {
  id: string;
  order: number;
  name: string;
  href: Route;
  /** "3 libres", "Lobby"… */
  note: string;
}

type Anchors = RefObject<Map<string, HTMLElement>>;

/**
 * Pisos pegados al edificio (pedido de Jacobo, 2026-11-15): en vez de tocar el piso en el 3D
 * o de un panel aparte, cada número queda al costado derecho del edificio, a la altura de su
 * piso, con una línea fina que sale de la fachada. Se ve como parte del modelo.
 *
 * Dentro del Canvas: en cada cuadro busca la esquina del edificio que queda más a la derecha
 * en pantalla (sirve en cualquier fachada y mientras la cámara gira) y ancla ahí cada número.
 */
export function FloorTagProjector({
  tags,
  anchors,
  footprint,
  floorHeight,
  visible,
}: {
  tags: FloorTag[];
  anchors: Anchors;
  footprint: [number, number][];
  floorHeight: number;
  visible: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3());
  // mientras la cámara se mueve (al girar, con su inercia, o en un vuelo) los números se
  // desvanecen y vuelven cuando se queda quieta: girando se veían desfasados (Jacobo, 2026-11-26).
  // Se compara la cámara de un cuadro con la del anterior; con el render bajo demanda no hay
  // cuadros cuando está quieta, así que un temporizador avisa que paró.
  const lastPos = useRef(new THREE.Vector3());
  const lastRot = useRef(new THREE.Quaternion());
  const still = useRef<number | undefined>(undefined);
  useEffect(() => {
    const html = document.documentElement;
    return () => {
      window.clearTimeout(still.current);
      delete html.dataset.orbit;
    };
  }, []);
  useFrame(() => {
    if (!visible) return;
    // con umbral: el final de la inercia mueve la cámara en cantidades que no se ven
    const moved = lastPos.current.distanceToSquared(camera.position) > 1e-6 || lastRot.current.angleTo(camera.quaternion) > 2e-4;
    if (moved) {
      lastPos.current.copy(camera.position);
      lastRot.current.copy(camera.quaternion);
      const html = document.documentElement;
      if (html.dataset.orbit !== 'moving') html.dataset.orbit = 'moving';
      window.clearTimeout(still.current);
      still.current = window.setTimeout(() => {
        html.dataset.orbit = 'still';
      }, 180);
    }
    // primero, dónde cae la esquina derecha de cada piso; después, todos los números en una sola
    // columna alineada en la más a la derecha (cada uno buscaba su esquina y con la perspectiva
    // quedaban corridos unos de otros: Jacobo, 2026-11-23)
    const spots: { el: HTMLElement; px: number; py: number }[] = [];
    let column = -Infinity;
    for (const t of tags) {
      const el = anchors.current.get(t.id);
      if (!el) continue;
      const y = (t.order - 0.5) * floorHeight;
      let best = -Infinity;
      let by = 0;
      let behind = true;
      for (const [x, z] of footprint) {
        v.current.set(x, y, z).project(camera);
        if (v.current.z > 1) continue;
        behind = false;
        if (v.current.x > best) {
          best = v.current.x;
          by = v.current.y;
        }
      }
      if (behind) {
        el.style.visibility = 'hidden';
        continue;
      }
      el.style.visibility = 'visible';
      const px = ((best + 1) / 2) * size.width;
      column = Math.max(column, px);
      spots.push({ el, px, py: ((1 - by) / 2) * size.height });
    }
    // nunca fuera de la pantalla: en celular el edificio llena el ancho y los números quedaban
    // medio cortados en el borde (Jacobo, 2026-11-16). ~72 px: la línea más el número.
    const x = Math.min(column, size.width - 72);
    for (const sp of spots) {
      sp.el.style.transform = `translate3d(${x.toFixed(1)}px, ${sp.py.toFixed(1)}px, 0) translateY(-50%)`;
    }
  });
  return null;
}

/** Fuera del Canvas: los números (enlaces) con su línea fina hacia la fachada. */
export function FloorTagLayer({
  tags,
  anchors,
  visible,
  currentId,
}: {
  tags: FloorTag[];
  anchors: Anchors;
  visible: boolean;
  currentId: string | null;
}) {
  const hovered = useTour((s) => s.hoveredLevelId);
  const tr = useT();
  const setHovered = useTour((s) => s.setHoveredLevel);
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500', visible ? 'opacity-100' : 'opacity-0')}>
      {/* se desvanecen mientras la cámara se mueve (data-orbit, FloorTagProjector) */}
      <ol aria-label={tr('Pisos del edificio')} className="transition-opacity duration-300 ease-out orbiting:opacity-0 orbiting:duration-150">
        {[...tags]
          .sort((a, b) => b.order - a.order)
          .map((t) => {
            const active = t.id === currentId;
            const hot = t.id === hovered;
            return (
              <li
                key={t.id}
                ref={(el) => {
                  if (el) anchors.current.set(t.id, el);
                  else anchors.current.delete(t.id);
                }}
                className={cn('absolute top-0 left-0', visible && 'pointer-events-auto')}
                style={{ visibility: 'hidden' }}
              >
                <Link
                  href={t.href}
                  tabIndex={visible ? 0 : -1}
                  aria-current={active ? 'page' : undefined}
                  aria-label={`${t.name}: ${t.note}`}
                  onPointerEnter={(e) => e.pointerType !== 'touch' && setHovered(t.id)}
                  onPointerLeave={(e) => e.pointerType !== 'touch' && setHovered(null)}
                  onFocus={() => setHovered(t.id)}
                  onBlur={() => setHovered(null)}
                  className="group flex items-center py-1.5 outline-none"
                >
                  {/* la línea fina que sale de la fachada */}
                  <span
                    aria-hidden
                    className={cn('block h-px transition-[width,background-color] duration-300', active || hot ? 'w-10 bg-bone' : 'w-6 bg-bone/50')}
                  />
                  <span
                    className={cn(
                      'ml-1.5 flex items-center gap-2 rounded-[3px] border px-2 py-0.5 whitespace-nowrap transition-[background-color,border-color,color] duration-300',
                      active ? 'border-bone bg-bone text-ink' : hot ? 'border-bone/80 bg-ink/70 text-bone' : 'border-bone/30 bg-ink/40 text-bone backdrop-blur-[2px]',
                    )}
                  >
                    <span className="font-display text-[1.05rem] leading-none tabular-nums">{t.order}</span>
                    <span
                      className={cn(
                        'grid text-[0.625rem] tracking-[0.12em] uppercase transition-[grid-template-columns,opacity] duration-300',
                        hot || active ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0',
                      )}
                    >
                      <span className="overflow-hidden">{t.note}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
      </ol>
    </div>
  );
}
