'use client';

import { Eye } from 'lucide-react';

import { useTour } from '@/lib/store';

/** Pide a la escena la vista desde la ventana de la unidad (se abre con el diafragma). */
export function ViewFromWindowButton({ unitId }: { unitId: string }) {
  const requestView = useTour((s) => s.requestView);
  return (
    <button
      type="button"
      onClick={() => requestView(unitId)}
      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-on-dark px-4 text-sm font-medium text-ink transition-colors hover:bg-bone"
    >
      <Eye aria-hidden className="size-4" />
      Ver la vista desde la ventana
    </button>
  );
}
