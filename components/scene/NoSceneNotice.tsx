'use client';

import { Box, Info } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { routes } from '@/lib/routes';
import { useTour } from '@/lib/store';

/** Aviso cuando la vista exterior lleva a la lista; permite volver al 3D (D-025). */
export function NoSceneNotice({ slug }: { slug: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const quality = useTour((s) => s.quality);
  const setConsent = useTour((s) => s.setConsent);
  if (params.get('aviso') !== 'sin-3d') return null;
  const noWebgl = quality === 'lista';
  return (
    <div role="status" className="mt-6 flex max-w-lg flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-secondary px-4 py-3 text-sm">
      <p className="flex flex-1 items-start gap-2 text-pretty">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        {noWebgl
          ? 'Este navegador no puede mostrar la vista 3D. Aquí tienes el recorrido completo.'
          : 'Aquí tienes el recorrido completo en lista.'}
      </p>
      {noWebgl ? null : (
        <button
          type="button"
          onClick={() => {
            setConsent('granted');
            router.push(routes.explorar(slug));
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 font-medium text-bone transition-colors hover:bg-ink/88"
        >
          <Box aria-hidden className="size-4" />
          Ver en 3D
        </button>
      )}
    </div>
  );
}
