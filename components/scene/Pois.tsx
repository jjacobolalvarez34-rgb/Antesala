'use client';

import { useFrame, useThree } from '@react-three/fiber';
import Link from 'next/link';
import type { Route } from 'next';
import { X } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';

export interface ScenePoi {
  id: string;
  name: string;
  description?: string;
  position: [number, number, number];
  levelName?: string;
  href?: Route;
}

export type PoiAnchors = RefObject<Map<string, HTMLElement>>;

/**
 * Dentro del Canvas: proyecta la posición 3D de cada zona común y mueve su
 * etiqueta HTML (sin re-render; escribe el transform directamente).
 */
export function PoiProjector({ pois, anchors }: { pois: ScenePoi[]; anchors: PoiAnchors }) {
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
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });
  return null;
}

/**
 * Fuera del Canvas: hotspots de zonas comunes como HTML normal
 * (DISENO.md §6: los textos de la interfaz no van dentro del canvas).
 */
export function PoiLayer({ pois, anchors, visible }: { pois: ScenePoi[]; anchors: PoiAnchors; visible: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {pois.map((p) => (
        <div
          key={p.id}
          ref={(el) => {
            if (el) anchors.current.set(p.id, el);
            else anchors.current.delete(p.id);
          }}
          className={`absolute top-0 left-0 ${visible ? 'pointer-events-auto' : ''}`}
          style={{ visibility: 'hidden', zIndex: open === p.id ? 2 : 1 }}
        >
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              tabIndex={visible ? 0 : -1}
              onClick={() => setOpen((o) => (o === p.id ? null : p.id))}
              aria-expanded={open === p.id}
              className="glass-dark flex min-h-9 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-2.5 text-[0.8125rem] font-medium whitespace-nowrap shadow-lg transition-transform duration-200 hover:scale-105"
            >
              <span className="relative grid size-3 place-items-center">
                <span className="absolute size-3 animate-ping rounded-full bg-accent-on-dark/50 motion-reduce:hidden" />
                <span className="size-2 rounded-full bg-accent-on-dark" />
              </span>
              {p.name}
            </button>
            {open === p.id ? (
              <div className="glass-dark absolute top-full mt-2 w-60 animate-in rounded-2xl p-4 text-sm shadow-xl duration-200 fade-in slide-in-from-top-1">
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
      ))}
    </div>
  );
}
