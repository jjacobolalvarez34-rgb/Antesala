'use client';

import { cn } from '@/lib/utils';
import type { Fidelity } from '@/lib/types';
import { useT } from '@/components/i18n/Lang';

const LABELS: Record<Fidelity, string> = {
  ilustrativa: 'Imagen ilustrativa',
  exacta: 'Foto real de esta unidad',
};

export function FidelityBadge({ fidelity, className }: { fidelity: Fidelity; className?: string }) {
  const tr = useT();
  return (
    <span
      className={cn(
        'glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] leading-none font-medium text-ink',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', fidelity === 'exacta' ? 'bg-ink' : 'bg-accent')} />
      {tr(LABELS[fidelity])}
    </span>
  );
}
