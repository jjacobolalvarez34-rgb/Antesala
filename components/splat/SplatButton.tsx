'use client';

import dynamic from 'next/dynamic';
import { Box } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { useT } from '@/components/i18n/Lang';

const SplatViewer = dynamic(() => import('./SplatViewer'), { ssr: false });

/** Abre el splat del espacio a pantalla completa; el visor se baja solo al tocar. */
export function SplatButton({ url, title, exact, className }: { url: string; title: string; exact: boolean; className?: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-[var(--hotel-r-btn,3px)] bg-ink px-5 text-[0.75rem] font-medium tracking-[0.14em] text-bone uppercase transition-colors hover:bg-accent',
          className,
        )}
      >
        <Box aria-hidden className="size-4" strokeWidth={1.5} />
        {tr(exact ? 'Recorrer en 3D real' : 'Recorrer en 3D')}
      </button>
      {open ? <SplatViewer url={url} title={title} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
