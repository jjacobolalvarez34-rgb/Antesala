import { cn } from '@/lib/utils';
import type { Fidelity } from '@/lib/types';

const LABELS: Record<Fidelity, string> = {
  ilustrativa: 'Imagen ilustrativa',
  exacta: 'Foto real de esta unidad',
};

export function FidelityBadge({ fidelity, className }: { fidelity: Fidelity; className?: string }) {
  return (
    <span
      className={cn(
        'glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] leading-none font-medium text-ink',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', fidelity === 'exacta' ? 'bg-ink' : 'bg-accent')} />
      {LABELS[fidelity]}
    </span>
  );
}
