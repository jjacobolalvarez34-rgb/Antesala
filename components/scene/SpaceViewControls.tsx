'use client';

import { Box, ChevronUp, Orbit } from 'lucide-react';
import { useState } from 'react';

import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Marco del panel del espacio en modo escena: alterna entre el 360° y la
 * maqueta, y se pliega (en celular y en escritorio) para dejar ver el espacio:
 * empieza recogido, como un panel desplegable.
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
  // en móvil empieza recogido: el espacio (360° o maqueta) es el protagonista
  const [folded, setFolded] = useState(true);
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
        {/* toda la franja abre y cierra (antes solo la flecha: Jacobo tocaba el nombre y no pasaba nada) */}
        <button
          type="button"
          onClick={() => setFolded((f) => !f)}
          aria-expanded={!folded}
          aria-label={folded ? `Mostrar detalles de ${title}` : 'Ocultar detalles'}
          className="group -my-1 ml-auto flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full pl-1 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{folded ? title : ''}</span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full transition-colors group-hover:bg-secondary">
            {/* en celular el panel está abajo y se despliega hacia arriba; en escritorio, arriba y hacia abajo */}
            <ChevronUp aria-hidden className={cn('size-5 transition-transform duration-300 md:rotate-180', !folded && 'rotate-180 md:rotate-0')} />
          </span>
        </button>
      </div>
      <div className={cn('min-h-0 overflow-y-auto', folded && 'hidden')}>{children}</div>
    </div>
  );
}
