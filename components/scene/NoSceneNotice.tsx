'use client';

import { Info } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

/** Aviso discreto cuando la vista 3D redirige a la lista (ARQUITECTURA.md §6). */
export function NoSceneNotice() {
  const params = useSearchParams();
  if (params.get('aviso') !== 'sin-3d') return null;
  return (
    <p role="status" className="mt-6 flex max-w-lg items-start gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-pretty">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
      Este dispositivo no muestra la vista 3D con fluidez, así que te dejamos el recorrido completo en lista.
    </p>
  );
}
