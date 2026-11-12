import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';

import { AntesalaSymbol } from '@/components/brand/AntesalaLogo';

/**
 * Visible si hotel.isDemo (CONTENIDO.md §2). Discreto pero legible.
 * En las demos lleva el símbolo de Antesala y la vuelta a su página: quien entra
 * desde la web de Antesala tiene por dónde volver (pedido de Jacobo, 2026-11-12).
 */
export function DemoBanner({ note = 'Hotel ficticio · imágenes ilustrativas' }: { note?: string }) {
  return (
    <div role="note" className="relative z-[60] bg-ink text-bone">
      <div className="mx-auto grid min-h-9 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-1.5 md:px-6">
        <Link
          href="/#demos"
          className="group inline-flex min-h-8 items-center gap-1.5 rounded-full pr-2.5 pl-1.5 text-xs text-bone/85 transition-colors hover:bg-bone/10 hover:text-bone"
        >
          <ArrowLeft aria-hidden className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          <AntesalaSymbol tone="oscuro" small className="h-4 w-auto" />
          <span className="font-[family-name:var(--font-cinzel)] tracking-[0.3em]">ANTESALA</span>
          <span className="sr-only">: volver a la página de Antesala</span>
        </Link>
        <p className="flex min-w-0 items-center justify-center gap-2 text-center text-xs tracking-wide">
          <Info aria-hidden className="hidden size-3.5 shrink-0 opacity-80 sm:block" />
          <span className="min-w-0">{note}</span>
        </p>
        {/* contrapeso del enlace para que la nota quede centrada */}
        <span aria-hidden className="hidden w-[7.5rem] sm:block" />
      </div>
    </div>
  );
}
