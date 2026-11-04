'use client';

import { Box, ChevronDown, ChevronUp, Orbit } from 'lucide-react';
import { useState } from 'react';

import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Marco del panel del espacio en modo escena: alterna entre el 360° y la
 * maqueta, y en móvil se puede plegar para dejar ver el panorama.
 */
export function SpaceSheetFrame({
  hasPano,
  title,
  children,
}: {
  hasPano: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const view360 = useTour((s) => s.view360);
  const setView360 = useTour((s) => s.setView360);
  const [folded, setFolded] = useState(false);
  const on360 = hasPano && view360;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
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
        <p className="min-w-0 flex-1 truncate text-sm font-medium md:hidden">{folded ? title : ''}</p>
        <button
          type="button"
          onClick={() => setFolded((f) => !f)}
          aria-expanded={!folded}
          aria-label={folded ? 'Mostrar detalles' : 'Ocultar detalles'}
          className="ml-auto grid size-10 place-items-center rounded-full hover:bg-secondary md:hidden"
        >
          {folded ? <ChevronUp aria-hidden className="size-5" /> : <ChevronDown aria-hidden className="size-5" />}
        </button>
      </div>
      <div className={cn('min-h-0 overflow-y-auto', folded && 'hidden md:block')}>{children}</div>
    </div>
  );
}
