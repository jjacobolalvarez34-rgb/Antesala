'use client';

/* eslint-disable @next/next/no-img-element -- fotos estáticas del hotel de demostración */
import { useState } from 'react';

/**
 * Comparador día/noche del edificio (página de Antesala): se arrastra la línea
 * o se usa el teclado (es un input range accesible encima de las fotos).
 */
export function DayNight({ day, night, alt }: { day: string; night: string; alt: string }) {
  const [split, setSplit] = useState(55);
  return (
    <figure className="relative overflow-hidden rounded-[1.75rem] bg-ink select-none">
      <img src={night} alt={`${alt}, de noche`} width={1600} height={1000} loading="lazy" className="block aspect-[16/10] w-full object-cover" />
      <img
        src={day}
        alt={`${alt}, de día`}
        width={1600}
        height={1000}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }}>
        <div className="absolute inset-y-0 -left-px w-0.5 bg-bone/90 shadow-[0_0_12px_rgb(0_0_0/0.35)]" />
        <div className="absolute top-1/2 -left-5 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-bone text-ink shadow-lg">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </div>
      </div>
      <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-bone/90 px-3 py-1 text-xs font-medium text-ink">Día</span>
      <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-bone">Noche</span>
      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label="Comparar el edificio de día y de noche"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </figure>
  );
}
