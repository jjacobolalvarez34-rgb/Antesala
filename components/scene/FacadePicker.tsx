'use client';

import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';

import { facadesOf } from '@/lib/building';
import { useT } from '@/components/i18n/Lang';
import { useTour } from '@/lib/store';
import type { Building } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Cambia la fachada que mira la cámara; la cámara viaja alrededor del
 * edificio hasta ella. Flechas para recorrer y opciones directas.
 */
export function FacadePicker({ building, className }: { building: Building; className?: string }) {
  const facades = useMemo(() => facadesOf(building), [building]);
  const index = useTour((s) => s.facade) % facades.length;
  const setFacade = useTour((s) => s.setFacade);
  const night = useTour((s) => s.night);
  const setNight = useTour((s) => s.setNight);
  const tr = useT();
  const go = (delta: number) => setFacade((index + delta + facades.length) % facades.length);
  const current = facades[index]!;

  return (
    <div className={cn('glass-dark flex items-center gap-1 rounded-2xl p-1.5 shadow-2xl', className)}>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label={tr('Fachada anterior')}
        className="grid size-11 shrink-0 place-items-center rounded-xl transition-colors hover:bg-bone/12"
      >
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        <p className="hidden text-xs tracking-[0.12em] text-bone/60 uppercase md:block">
          {tr('Vista {i} de {n}', { i: index + 1, n: facades.length })}
        </p>
        <p className="truncate text-sm font-medium">{current.label}</p>
      </div>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={tr('Fachada siguiente')}
        className="grid size-11 shrink-0 place-items-center rounded-xl transition-colors hover:bg-bone/12"
      >
        <ChevronRight aria-hidden className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => setNight(!night)}
        aria-pressed={night}
        aria-label={tr(night ? 'Ver de día' : 'Ver de noche')}
        title={tr(night ? 'Ver de día' : 'Ver de noche')}
        className="ml-1 grid size-11 shrink-0 place-items-center rounded-xl border-l border-bone/15 transition-colors hover:bg-bone/12"
      >
        {night ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
      </button>
    </div>
  );
}
