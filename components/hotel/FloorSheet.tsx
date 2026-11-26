'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronDown, Layers } from 'lucide-react';
import { useState } from 'react';

import { formatCOP, offerTexts, pluralize, unitPrice } from '@/lib/hotel';
import type { Level, Offer, Poi, Unit } from '@/lib/types';
import { useLang, useRoutes, useT } from '@/components/i18n/Lang';

/**
 * Panel del piso sobre la escena 3D (DISENO.md §3): bottom sheet en móvil,
 * panel lateral en escritorio. Solo se ve en modo escena. Las habitaciones se
 * eligen tocándolas en la planta (no hay lista): aquí solo el resumen.
 */
export function FloorSheet({
  slug,
  level,
  total,
  units,
  pois,
  above,
  below,
  offer = 'noche',
  hidden = false,
  levels = [],
}: {
  /** todos los pisos, para "Cambiar de piso" (con el piso aislado no se ve el edificio) */
  levels?: Pick<Level, 'id' | 'name' | 'order'>[];
  /** el glamping usa su propio panel (TerrainOverlay) */
  hidden?: boolean;
  offer?: Offer;
  slug: string;
  level: Level;
  total: number;
  units: Unit[];
  pois: Poi[];
  above?: Level;
  below?: Level;
}) {
  const tr = useT();
  const routes = useRoutes();
  const lang = useLang();
  const free = units.filter((u) => !u.occupied);
  const [picking, setPicking] = useState(false);
  if (hidden) return null;
  const prices = free.map(unitPrice).filter((p): p is number => p !== undefined);
  const from = prices.length ? Math.min(...prices) : undefined;
  return (
    <section
      aria-label={tr('Unidades del {x}', { x: level.name })}
      className="glass-dark pointer-events-auto fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-30 hidden max-h-[36dvh] animate-in flex-col overflow-hidden rounded-3xl shadow-2xl duration-500 fade-in slide-in-from-bottom-4 scene:flex md:inset-x-auto md:top-32 md:right-6 md:bottom-auto md:max-h-[calc(100dvh-var(--booking-bar-h)-11rem)] md:w-[400px] md:slide-in-from-right-4"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <p className="text-xs tracking-[0.14em] text-bone/65 uppercase">
            {tr('{x} de {n}', { x: level.name, n: total })}
          </p>
          <h1 className="font-display text-title leading-none">{level.name}</h1>
        </div>
        <nav aria-label="Otros pisos" className="flex gap-2">
          {above ? (
            <Link
              href={routes.piso(slug, above.id)}
              aria-label={tr('Subir a {x}', { x: above.name })}
              className="grid size-11 place-items-center rounded-full bg-bone/10 transition-colors hover:bg-bone/20"
            >
              <ArrowUp aria-hidden className="size-4" />
            </Link>
          ) : null}
          {below ? (
            <Link
              href={routes.piso(slug, below.id)}
              aria-label={tr('Bajar a {x}', { x: below.name })}
              className="grid size-11 place-items-center rounded-full bg-bone/10 transition-colors hover:bg-bone/20"
            >
              <ArrowDown aria-hidden className="size-4" />
            </Link>
          ) : null}
        </nav>
      </header>

      {/* el piso se ve solo (sin el edificio): cambiar de piso tiene que estar a la vista (Jacobo, 2026-11-26) */}
      {levels.length > 1 ? (
        <div className="px-5 pb-3">
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-bone/15 bg-bone/8 px-4 text-sm font-medium transition-colors hover:bg-bone/15"
          >
            <span className="flex items-center gap-2">
              <Layers aria-hidden className="size-4 text-bone/75" strokeWidth={1.5} />
              {tr('Cambiar de piso')}
            </span>
            <ChevronDown aria-hidden className={`size-4 transition-transform duration-300 ${picking ? 'rotate-180' : ''}`} />
          </button>
          {picking ? (
            <ol aria-label={tr('Pisos del edificio')} className="mt-2 grid animate-in grid-cols-3 gap-1.5 duration-300 fade-in slide-in-from-top-1">
              {[...levels]
                .sort((a, b) => b.order - a.order)
                .map((l) => (
                  <li key={l.id}>
                    {l.id === level.id ? (
                      <span aria-current="page" className="flex min-h-10 items-center justify-center rounded-xl bg-bone px-2 text-center text-xs font-medium text-ink">
                        {l.name}
                      </span>
                    ) : (
                      <Link
                        href={routes.piso(slug, l.id)}
                        onClick={() => setPicking(false)}
                        className="flex min-h-10 items-center justify-center rounded-xl bg-bone/10 px-2 text-center text-xs transition-colors hover:bg-bone/20"
                      >
                        {l.name}
                      </Link>
                    )}
                  </li>
                ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      <div className="scrollbar-none overflow-y-auto px-5 pb-4">
        {units.length ? (
          <p className="text-sm text-bone/80">
            {pluralize(units.length, tr('habitación'), tr('habitaciones'))}
            {free.length < units.length ? ` · ${pluralize(free.length, offerTexts(offer, lang).free, offerTexts(offer, lang).freePlural)}` : null}
            {from !== undefined ? (
              <>
                {` · ${tr('desde')} `}
                <span className="font-semibold text-bone">{formatCOP(from)}</span>
                <span className="text-bone/65">{offerTexts(offer, lang).suffix}</span>
              </>
            ) : null}
          </p>
        ) : null}
        {pois.length ? (
          <ul className={units.length ? 'mt-3 flex flex-col gap-2 border-t border-bone/10 pt-3' : 'flex flex-col gap-2'}>
            {pois.map((p) => (
              <li key={p.id} className="text-sm">
                <p className="font-medium">{p.name}</p>
                {p.description ? <p className="mt-0.5 hidden text-pretty text-bone/70 md:block">{p.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
