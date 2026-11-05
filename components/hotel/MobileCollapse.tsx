'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

/**
 * En móvil, los detalles de un panel sobre la escena empiezan recogidos (la
 * maqueta es la protagonista); en escritorio siempre se ven.
 */
export function MobileCollapse({ children, label = 'Ver detalles' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-bone/10 px-3.5 text-sm text-bone/85 transition-colors hover:bg-bone/20 md:hidden"
      >
        {open ? 'Ocultar detalles' : label}
        <ChevronDown aria-hidden className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={id} className={open ? 'animate-in duration-300 fade-in' : 'hidden md:block'}>
        {children}
      </div>
    </>
  );
}
