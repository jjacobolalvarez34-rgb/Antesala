import { ExactUnitPicker } from '@/components/hotel/ExactUnitPicker';
import { MobileCollapse } from '@/components/hotel/MobileCollapse';
import { OccupiedNotice } from '@/components/hotel/OccupiedNotice';
import { ViewFromWindowButton } from '@/components/scene/ViewFromWindowButton';
import { formatArea, formatCOP, pluralize, unitPrice } from '@/lib/hotel';
import type { Category, Hotel, Level, Unit } from '@/lib/types';

/**
 * Panel de la unidad sobre su maqueta 3D (bloque 3): bottom sheet en móvil,
 * lateral en escritorio. Solo se ve en modo escena. En móvil empieza
 * recogido (nombre y precio); los espacios se tocan en la maqueta.
 */
export function UnitSheet({
  hotel,
  unit,
  category,
  level,
}: {
  hotel: Hotel;
  unit: Unit;
  category?: Category;
  level?: Level;
}) {
  const price = unitPrice(unit);
  return (
    <section
      aria-label={unit.name}
      className="glass-dark pointer-events-auto fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-30 hidden max-h-[46dvh] animate-in flex-col overflow-hidden rounded-3xl shadow-2xl duration-500 fade-in slide-in-from-bottom-4 scene:flex md:inset-x-auto md:top-32 md:right-6 md:bottom-auto md:max-h-[calc(100dvh-var(--booking-bar-h)-11rem)] md:w-[380px] md:slide-in-from-right-4"
    >
      <div className="scrollbar-none overflow-y-auto p-4 md:p-5">
        <p className="text-xs tracking-[0.12em] text-bone/60 uppercase">
          {[category?.name, level?.name].filter(Boolean).join(' · ')}
        </p>
        <h1 className="mt-1 font-display text-subtitle leading-none md:text-4xl">{unit.name}</h1>
        {price !== undefined ? (
          <p className="mt-2 text-sm md:mt-3">
            <span className="text-lg font-semibold">{formatCOP(price)}</span>
            <span className="text-bone/65"> / noche</span>
            {unit.viewPremiumCOP ? (
              <span className="block text-xs font-medium text-accent-on-dark">
                Incluye {formatCOP(unit.viewPremiumCOP)} por vista
              </span>
            ) : null}
          </p>
        ) : null}
        <OccupiedNotice hotel={hotel} unit={unit} tone="dark" className="mt-3" />
        <MobileCollapse>
          <p className="mt-3 text-sm text-bone/80">
            {formatArea(unit.areaM2)} · {pluralize(unit.capacity, 'persona', 'personas')} · {unit.beds}
          </p>
          {unit.view ? <p className="mt-2 text-sm text-pretty text-bone/75">{unit.view}</p> : null}
          {unit.exterior?.length ? <ViewFromWindowButton unitId={unit.id} /> : null}
          <ExactUnitPicker hotel={hotel} unit={unit} tone="dark" className="mt-5" />
        </MobileCollapse>
      </div>
    </section>
  );
}
