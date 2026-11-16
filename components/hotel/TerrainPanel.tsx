'use client';

import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import type { Route } from 'next';

import { formatCOP } from '@/lib/hotel';
import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

export interface TerrainPanelCabin {
  id: string;
  name: string;
  category?: string;
  price?: number;
  capacity: number;
  occupied: boolean;
  href: Route;
}

/**
 * Panel del glamping sobre el 3D (D-083): los refugios en lista (se sincronizan con el 3D:
 * pasar por uno lo entibia en el valle), el cambio entre la vista del valle y la aérea, y
 * el día y la noche. En el celular va abajo, en una franja que se desliza.
 */
export function TerrainPanel({
  cabins,
  valleHref,
  aereaHref,
  aerial,
  offer = 'noche',
}: {
  cabins: TerrainPanelCabin[];
  valleHref: Route;
  aereaHref: Route;
  aerial: boolean;
  offer?: string;
}) {
  const hovered = useTour((s) => s.hoveredUnit?.id ?? null);
  const setHovered = useTour((s) => s.setHoveredUnit);
  const night = useTour((s) => s.night);
  const setNight = useTour((s) => s.setNight);
  const tab = 'inline-flex min-h-9 items-center rounded-[3px] px-3 text-[0.6875rem] tracking-[0.16em] uppercase transition-colors';
  return (
    <div className="flex w-full flex-col gap-2 md:w-[21rem]">
      <div className="flex items-center gap-1.5 rounded-md p-1.5 glass-dark">
        <Link href={valleHref} aria-current={!aerial ? 'page' : undefined} className={cn(tab, !aerial ? 'bg-bone text-ink' : 'text-bone/80 hover:text-bone')}>
          El valle
        </Link>
        <Link href={aereaHref} aria-current={aerial ? 'page' : undefined} className={cn(tab, aerial ? 'bg-bone text-ink' : 'text-bone/80 hover:text-bone')}>
          Vista aérea
        </Link>
        <button
          type="button"
          onClick={() => setNight(!night)}
          aria-pressed={night}
          aria-label={night ? 'Ver de día' : 'Ver de noche'}
          className="ml-auto grid size-9 place-items-center rounded-[3px] text-bone/85 transition-colors hover:bg-bone/12"
        >
          {night ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
        </button>
      </div>
      <ul aria-label="Refugios" className="scrollbar-none flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {cabins.map((c) => (
          <li key={c.id} className="shrink-0">
            <Link
              href={c.href}
              onPointerEnter={(e) => e.pointerType !== 'touch' && setHovered({ id: c.id, x: 0, y: 0 })}
              onPointerLeave={(e) => e.pointerType !== 'touch' && setHovered(null)}
              onFocus={() => setHovered({ id: c.id, x: 0, y: 0 })}
              onBlur={() => setHovered(null)}
              className={cn(
                'flex min-h-14 w-56 items-center justify-between gap-3 rounded-md px-4 py-2.5 text-bone transition-colors md:w-full',
                hovered === c.id ? 'bg-bone text-ink' : 'glass-dark hover:bg-ink',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-display text-lg leading-tight">{c.name}</span>
                <span className={cn('block truncate text-xs', hovered === c.id ? 'text-ink/65' : 'text-bone/65')}>
                  {c.category} · {c.capacity} pers.{c.occupied ? ' · ocupado' : ''}
                </span>
              </span>
              {c.price ? (
                <span className="shrink-0 text-right text-xs">
                  <span className="block font-medium">{formatCOP(c.price)}</span>
                  <span className={hovered === c.id ? 'text-ink/60' : 'text-bone/60'}>/ {offer}</span>
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
