'use client';

import { Box, LoaderCircle } from 'lucide-react';

import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useT } from '@/components/i18n/Lang';

/**
 * Estado de la escena en la vista exterior sin 3D: cargando, o la pregunta
 * "¿quieres verlo en 3D?" cuando el equipo parece justo (D-025).
 */
export function SceneStatus({ className }: { className?: string }) {
  const { quality, askConsent, consent, sceneReady, setConsent } = useTour();
  const tr = useT();
  if (quality === null || quality === 'lista' || consent === 'declined' || sceneReady) return null;

  if (askConsent && consent === null) {
    return (
      <div role="dialog" aria-labelledby="pregunta-3d" className={cn('rounded-3xl border border-border bg-card p-5', className)}>
        <p id="pregunta-3d" className="flex items-center gap-2 font-medium">
          <Box aria-hidden className="size-4 text-accent" />
          {tr('¿Quieres ver el edificio en 3D?')}
        </p>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {tr('En este dispositivo puede ir algo lento. Si prefieres, sigue con la lista: tiene el mismo recorrido.')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConsent('granted')}
            className="inline-flex min-h-11 items-center rounded-md bg-ink px-5 text-sm font-medium text-bone transition-colors hover:bg-ink/88"
          >
            {tr('Ver en 3D')}
          </button>
          <button
            type="button"
            onClick={() => setConsent('declined')}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            {tr('Ver la lista')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <p role="status" className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {tr('Preparando el edificio en 3D…')}
    </p>
  );
}
