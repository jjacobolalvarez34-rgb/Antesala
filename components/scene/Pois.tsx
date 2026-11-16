'use client';

import { useFrame, useThree } from '@react-three/fiber';
import Link from 'next/link';
import type { Route } from 'next';
import { Orbit, X } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';

import { useTour } from '@/lib/store';

export interface ScenePoi {
  id: string;
  name: string;
  viewpoints?: { id: string; name: string; position: [number, number, number]; yaw: number }[];
  description?: string;
  position: [number, number, number];
  levelName?: string;
  href?: Route;
}

export type PoiAnchors = RefObject<Map<string, HTMLElement>>;

/** Zonas comunes cercanas en un solo punto (Jacobo, 2026-11-16: en Cénit eran cinco puntos encimados). */
export interface PoiGroup {
  id: string;
  position: [number, number, number];
  members: ScenePoi[];
}

/** Agrupa las zonas a menos de `dist` metros (en un hotel alto, el lobby, el bar y el spa caen juntos). */
export function groupPois(pois: ScenePoi[], dist = 9): PoiGroup[] {
  const groups: PoiGroup[] = [];
  for (const p of pois) {
    const g = groups.find((x) =>
      x.members.some((m) => Math.hypot(m.position[0] - p.position[0], m.position[1] - p.position[1], m.position[2] - p.position[2]) < dist),
    );
    if (g) g.members.push(p);
    else groups.push({ id: p.id, position: [...p.position], members: [p] });
  }
  for (const g of groups) {
    const n = g.members.length;
    g.position = [0, 1, 2].map((i) => g.members.reduce((s, m) => s + m.position[i]!, 0) / n) as [number, number, number];
    if (n > 1) g.id = `grupo-${g.members[0]!.id}`;
  }
  return groups;
}

/**
 * Dentro del Canvas: proyecta la posición 3D de cada zona común y mueve su
 * etiqueta HTML (sin re-render; escribe el transform directamente).
 */
export function PoiProjector({
  pois,
  anchors,
  anchor = 'center',
}: {
  pois: { id: string; position: [number, number, number] }[];
  anchors: PoiAnchors;
  /** 'bottom': el borde de abajo del letrero queda en el punto (letreros con línea hacia abajo) */
  anchor?: 'center' | 'bottom';
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3());
  useFrame(() => {
    for (const p of pois) {
      const el = anchors.current.get(p.id);
      if (!el) continue;
      v.current.set(...p.position).project(camera);
      const hidden = v.current.z > 1 || Math.abs(v.current.x) > 1.1 || Math.abs(v.current.y) > 1.1;
      el.style.visibility = hidden ? 'hidden' : 'visible';
      const x = ((v.current.x + 1) / 2) * size.width;
      const y = ((1 - v.current.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${anchor === 'bottom' ? '-100%' : '-50%'})`;
    }
  });
  return null;
}

/** Etiquetas de los espacios sobre la maqueta: enlaces al detalle, sincronizados con el hover 3D. */
export function SpaceLabelLayer({
  labels,
  anchors,
  visible,
  current,
  hovered,
  onHover,
  ariaLabel = 'Espacios de la unidad',
  reveal = false,
}: {
  /** solo se ve la etiqueta bajo el puntero (o con foco del teclado): la planta queda limpia */
  reveal?: boolean;
  labels: { id: string; name: string; href: Route }[];
  anchors: PoiAnchors;
  visible: boolean;
  current: string | null;
  hovered: string | null;
  onHover: (id: string | null) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <ul aria-label={ariaLabel}>
        {labels.map((l) => {
          const active = l.id === current || l.id === hovered;
          return (
            <li
              key={l.id}
              ref={(el) => {
                if (el) anchors.current.set(l.id, el);
                else anchors.current.delete(l.id);
              }}
              className={`absolute top-0 left-0 ${visible && !reveal ? 'pointer-events-auto' : ''}`}
              style={{ visibility: 'hidden' }}
            >
              <Link
                href={l.href}
                tabIndex={visible ? 0 : -1}
                aria-current={l.id === current ? 'page' : undefined}
                onPointerEnter={() => onHover(l.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(l.id)}
                onBlur={() => onHover(null)}
                className={`flex min-h-8 items-center rounded-full px-3 text-xs font-medium whitespace-nowrap shadow-lg transition-[color,background-color,opacity] duration-200 md:min-h-9 md:px-3.5 md:text-[0.8125rem] ${
                  active ? 'bg-accent-on-dark text-ink' : 'glass-dark'
                } ${reveal && !active ? 'opacity-0 focus-visible:opacity-100' : ''}`}
              >
                {l.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Fuera del Canvas: hotspots de zonas comunes como HTML normal
 * (DISENO.md §6: los textos de la interfaz no van dentro del canvas).
 */
export function PoiLayer({ pois, anchors, visible }: { pois: PoiGroup[]; anchors: PoiAnchors; visible: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  // la tarjeta se abre hacia donde haya espacio: hacia abajo si el punto está en la mitad superior
  const [below, setBelow] = useState(false);
  const setViewpoint = useTour((s) => s.setViewpoint);
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {pois.map((g) => {
        const p = g.members[0]!;
        const many = g.members.length > 1;
        const label = many ? `${g.members.length} zonas comunes` : p.name;
        return (
        <div
          key={g.id}
          ref={(el) => {
            if (el) anchors.current.set(g.id, el);
            else anchors.current.delete(g.id);
          }}
          className={`absolute top-0 left-0 ${visible ? 'pointer-events-auto' : ''}`}
          style={{ visibility: 'hidden', zIndex: open === g.id ? 2 : 1 }}
        >
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              tabIndex={visible ? 0 : -1}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setBelow(r.top + r.height / 2 < window.innerHeight * 0.5);
                setOpen((o) => (o === g.id ? null : g.id));
              }}
              aria-expanded={open === g.id}
              aria-label={label}
              className="glass-dark group flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2.5 text-[0.8125rem] font-medium whitespace-nowrap shadow-lg ring-2 ring-accent-on-dark/70 transition-all duration-200 hover:scale-110 hover:pr-3.5 hover:ring-accent-on-dark"
            >
              <span className="relative grid size-3 place-items-center">
                <span className="absolute size-5 animate-ping rounded-full bg-accent-on-dark/45" />
                <span className="size-3 rounded-full bg-accent-on-dark shadow-[0_0_10px_2px_rgb(184_154_106/0.7)]" />
              </span>
              {many ? <span className="text-xs tabular-nums">{g.members.length}</span> : null}
              <span className="hidden group-hover:inline group-focus-visible:inline">{many ? 'Zonas comunes' : p.name}</span>
            </button>
            {open === g.id && many ? (
              <div
                className={`glass-dark absolute w-72 animate-in rounded-2xl p-2 text-sm shadow-xl duration-200 fade-in ${
                  below ? 'top-full mt-3 slide-in-from-top-1' : 'bottom-full mb-3 slide-in-from-bottom-1'
                }`}
              >
                <div className="flex items-center justify-between gap-2 px-2 pt-1">
                  <p className="text-[0.6875rem] font-medium tracking-[0.2em] text-bone/60 uppercase">Zonas comunes</p>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    aria-label="Cerrar"
                    className="grid size-8 place-items-center rounded-full hover:bg-bone/10"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
                <ul className="mt-1 flex max-h-[50dvh] flex-col overflow-y-auto">
                  {g.members.map((m) => (
                    <li key={m.id} className="rounded-xl px-2 py-2 transition-colors hover:bg-bone/8">
                      <p className="font-medium">
                        {m.name}
                        {m.levelName && m.levelName !== m.name ? <span className="font-normal text-bone/65"> · {m.levelName}</span> : null}
                      </p>
                      {m.description ? <p className="mt-0.5 text-[0.8125rem] text-pretty text-bone/75">{m.description}</p> : null}
                      <div className="mt-1 flex flex-wrap items-center gap-x-4">
                        {m.viewpoints?.length ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpen(null);
                              setViewpoint({ poiId: m.id, index: 0 });
                            }}
                            className="inline-flex min-h-9 items-center gap-1.5 text-[0.8125rem] font-medium text-accent-on-dark underline-offset-4 hover:underline"
                          >
                            <Orbit aria-hidden className="size-4" />
                            Mirar en 360°
                          </button>
                        ) : null}
                        {m.href ? (
                          <Link
                            href={m.href}
                            className="inline-flex min-h-9 items-center text-[0.8125rem] font-medium text-accent-on-dark underline-offset-4 hover:underline"
                          >
                            Ver {m.levelName?.toLowerCase() ?? 'el piso'}
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {open === g.id && !many ? (
              <div className={`glass-dark absolute w-60 animate-in rounded-2xl p-4 text-sm shadow-xl duration-200 fade-in ${
                  below ? 'top-full mt-3 slide-in-from-top-1' : 'bottom-full mb-3 slide-in-from-bottom-1'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {p.name}
                    {p.levelName ? <span className="font-normal text-bone/70"> · {p.levelName}</span> : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    aria-label="Cerrar"
                    className="-mt-1 -mr-1 grid size-8 place-items-center rounded-full hover:bg-bone/10"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
                {p.description ? <p className="mt-1.5 text-pretty text-bone/80">{p.description}</p> : null}
                {p.viewpoints?.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(null);
                      setViewpoint({ poiId: p.id, index: 0 });
                    }}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent-on-dark px-3 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-bone"
                  >
                    <Orbit aria-hidden className="size-4" />
                    Mirar desde aquí (360°)
                  </button>
                ) : null}
                {p.href ? (
                  <Link
                    href={p.href}
                    className="mt-3 inline-flex min-h-9 items-center text-[0.8125rem] font-medium text-accent-on-dark underline-offset-4 hover:underline"
                  >
                    Ver {p.levelName?.toLowerCase() ?? 'el piso'}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        );
      })}
    </div>
  );
}
