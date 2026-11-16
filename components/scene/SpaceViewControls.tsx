'use client';

import { Box, ChevronDown, Images, MapPin, Orbit } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Marco del panel del espacio en modo escena (rediseñado el 2026-11-16 con las notas del papá
 * de Jacobo: "no sabía que podía bajar", "se ve saturado", "no es intuitivo").
 *
 * Siempre a la vista, en este orden:
 * 1. los espacios de la unidad en una fila (lo que más se usa: cambiar de espacio);
 * 2. 360° / Maqueta, el punto del 360° si hay dos, y un botón con texto "Fotos y detalles".
 *
 * Lo demás (fotos, descripción, dotación) se despliega con ese botón; empieza recogido para
 * que el espacio sea el protagonista.
 */
export function SpaceSheetFrame({
  hasPano,
  title,
  nav,
  children,
}: {
  hasPano: boolean;
  title: string;
  /** la fila de espacios de la unidad */
  nav?: ReactNode;
  children: ReactNode;
}) {
  const view360 = useTour((s) => s.view360);
  const setView360 = useTour((s) => s.setView360);
  const panoSpot = useTour((s) => s.panoSpot);
  const panoSpots = useTour((s) => s.panoSpots);
  const setPanoSpot = useTour((s) => s.setPanoSpot);
  const [open, setOpen] = useState(false);
  const on360 = hasPano && view360;

  return (
    <div className="flex min-h-0 flex-col">
      {/* asa: se ve que es un panel que se despliega */}
      <span aria-hidden className="mx-auto mt-2 block h-1 w-9 rounded-full bg-ink/15 md:hidden" />
      {nav ? <div className="px-3 pt-2 md:pt-3">{nav}</div> : null}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        {hasPano ? (
          <div role="group" aria-label="Vista del espacio" className="flex rounded-full bg-secondary p-1">
            <button
              type="button"
              aria-pressed={on360}
              onClick={() => setView360(true)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
                on360 ? 'bg-ink text-bone' : 'hover:bg-card',
              )}
            >
              <Orbit aria-hidden className="size-4" /> 360°
            </button>
            <button
              type="button"
              aria-pressed={!on360}
              onClick={() => setView360(false)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
                !on360 ? 'bg-ink text-bone' : 'hover:bg-card',
              )}
            >
              <Box aria-hidden className="size-4" /> Maqueta
            </button>
          </div>
        ) : null}
        {on360 && panoSpots > 1 ? (
          <button
            type="button"
            onClick={() => setPanoSpot((panoSpot + 1) % panoSpots)}
            aria-label={`Mirar desde el punto ${((panoSpot + 1) % panoSpots) + 1} de ${panoSpots}`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-medium transition-colors hover:bg-card"
          >
            <MapPin aria-hidden className="size-4" />
            Punto {panoSpot + 1}/{panoSpots}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? `Ocultar fotos y detalles de ${title}` : `Ver fotos y detalles de ${title}`}
          className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium transition-colors hover:border-ink/40"
        >
          <Images aria-hidden className="size-4" />
          {open ? 'Ocultar' : 'Fotos y detalles'}
          <ChevronDown aria-hidden className={cn('size-4 transition-transform duration-300', open && 'rotate-180')} />
        </button>
      </div>
      <div className={cn('min-h-0 overflow-y-auto border-t border-border', !open && 'hidden')}>{children}</div>
    </div>
  );
}
