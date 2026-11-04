import { cn } from '@/lib/utils';

/** Lista de datos cortos (área, capacidad, camas…) como pares término/valor. */
export function Facts({ items, className }: { items: { label: string; value: string }[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border', className)}>
      {items.map((f) => (
        <div key={f.label} className="bg-card px-4 py-3">
          <dt className="eyebrow">{f.label}</dt>
          <dd className="mt-1 text-[0.9375rem] font-medium text-pretty">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
