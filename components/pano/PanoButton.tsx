'use client';

import dynamic from 'next/dynamic';
import { Orbit } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { useT } from '@/components/i18n/Lang';

const PanoViewer = dynamic(() => import('./PanoViewer'), { ssr: false });
import type { PanoSpace } from './PanoViewer';

/** Abre el 360° del espacio a pantalla completa; el visor se baja solo al tocar (D-084). */
export function PanoButton({
  url,
  title,
  yaw,
  className,
  spaces,
}: {
  url: string;
  title: string;
  yaw?: number;
  className?: string;
  /** los otros 360° de la unidad, para pasar de uno a otro sin cerrar */
  spaces?: PanoSpace[];
}) {
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
        <Orbit aria-hidden className="size-4" strokeWidth={1.5} />
        {tr('Mirar en 360°')}
      </button>
      {open ? <PanoViewer url={url} title={title} yaw={yaw} spaces={spaces} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
