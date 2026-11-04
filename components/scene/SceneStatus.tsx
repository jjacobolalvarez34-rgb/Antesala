'use client';

import { LoaderCircle } from 'lucide-react';

import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

/** Mensaje discreto mientras se prepara la escena 3D. */
export function SceneStatus({ className }: { className?: string }) {
  const quality = useTour((s) => s.quality);
  const ready = useTour((s) => s.sceneReady);
  if (quality === 'lista' || ready) return null;
  return (
    <p role="status" className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
      Preparando el edificio en 3D…
    </p>
  );
}
