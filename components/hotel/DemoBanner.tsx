import { Info } from 'lucide-react';

/** Visible si hotel.isDemo (CONTENIDO.md §2). Discreto pero legible. */
export function DemoBanner() {
  return (
    <div role="note" className="relative z-20 bg-ink text-bone">
      <p className="mx-auto flex min-h-8 max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs tracking-wide">
        <Info aria-hidden className="size-3.5 shrink-0 opacity-80" />
        <span>Hotel ficticio · imágenes ilustrativas</span>
      </p>
    </div>
  );
}
