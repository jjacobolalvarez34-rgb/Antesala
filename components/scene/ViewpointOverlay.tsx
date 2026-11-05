'use client';

import { ChevronLeft, ChevronRight, Hand, X } from 'lucide-react';

import { useTour } from '@/lib/store';

import type { ScenePoi } from './Pois';

/**
 * Controles del mirador (D-042): nombre del punto, flechas para saltar entre
 * miradores y salir. Arrastrar mira alrededor en vivo (día o noche).
 */
export function ViewpointOverlay({ pois }: { pois: ScenePoi[] }) {
  const viewpoint = useTour((s) => s.viewpoint);
  const setViewpoint = useTour((s) => s.setViewpoint);
  const poi = viewpoint ? pois.find((p) => p.id === viewpoint.poiId) : undefined;
  const list = poi?.viewpoints ?? [];
  if (!viewpoint || !poi || !list.length) return null;
  const current = list[viewpoint.index % list.length]!;
  const go = (d: number) => setViewpoint({ poiId: poi.id, index: (viewpoint.index + d + list.length) % list.length });

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-30 flex flex-col items-center gap-2">
      <p className="glass-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-bone/80">
        <Hand aria-hidden className="size-3.5" /> Arrastra para mirar alrededor
      </p>
      <div className="glass-dark pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-2xl p-1.5 shadow-2xl">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Mirador anterior"
          className="grid size-11 shrink-0 place-items-center rounded-xl transition-colors hover:bg-bone/12"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="hidden text-xs tracking-[0.12em] text-bone/60 uppercase md:block">{poi.name}</p>
          <p className="truncate text-sm font-medium">{current.name}</p>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Mirador siguiente"
          className="grid size-11 shrink-0 place-items-center rounded-xl transition-colors hover:bg-bone/12"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setViewpoint(null)}
          aria-label="Salir del mirador"
          className="ml-1 grid size-11 shrink-0 place-items-center rounded-xl border-l border-bone/15 transition-colors hover:bg-bone/12"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  );
}
