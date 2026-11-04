'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useEffect } from 'react';

import { useReducedMotion } from '@/components/motion/useReducedMotion';
import { detectQuality, qualityOverride } from '@/lib/capabilities';
import { routes } from '@/lib/routes';
import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

import type { SceneData, SceneStage } from './Scene';

/** El JS de three.js se descarga solo cuando hace falta (ARQUITECTURA.md §6). */
const Scene = dynamic(() => import('./Scene'), { ssr: false });

/**
 * Capa persistente del layout: decide la calidad, monta la escena la primera
 * vez que una etapa la necesita y ya no la desmonta (Canvas persistente).
 * Marca <html data-scene="on"> cuando la escena está visible y lista; las
 * páginas usan la variante `scene:` para pasar de lista a paneles sobre el 3D.
 */
export function SceneLayer({ data }: { data: SceneData }) {
  const router = useRouter();
  const [stageName, param] = useSelectedLayoutSegments();
  const reduced = useReducedMotion();
  const { quality, qualityLocked, sceneReady, sceneMounted, intro, setQuality, mountScene } = useTour();

  const stage: SceneStage | null =
    stageName === 'explorar'
      ? { kind: 'explorar' }
      : stageName === 'piso' && param
        ? { kind: 'piso', levelId: param }
        : null;

  useEffect(() => {
    if (quality !== null) return;
    const forced = qualityOverride();
    setQuality(forced ?? detectQuality(), forced !== null);
  }, [quality, setQuality]);

  const wants3d = stage !== null && quality !== null && quality !== 'lista';

  useEffect(() => {
    if (wants3d) mountScene(stage?.kind === 'explorar');
  }, [wants3d, stage?.kind, mountScene]);

  // Sin 3D (sin WebGL2, render por software o FPS bajo): la vista exterior pasa a la lista
  useEffect(() => {
    if (stageName === 'explorar' && quality === 'lista') {
      router.replace(`${routes.lista(data.slug)}?aviso=sin-3d` as ReturnType<typeof routes.lista>);
    }
  }, [stageName, quality, router, data.slug]);

  const active = wants3d && sceneReady;
  useEffect(() => {
    document.documentElement.dataset.scene = active ? 'on' : 'off';
  }, [active]);

  if (!sceneMounted || quality === null || quality === 'lista') return null;

  return (
    <div
      aria-hidden
      className={cn(
        'fixed inset-0 z-0 transition-opacity ease-out',
        reduced ? 'duration-200' : 'duration-700',
        active ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <Scene
        data={data}
        stage={stage ?? { kind: 'explorar' }}
        active={wants3d}
        quality={quality}
        qualityLocked={qualityLocked}
        reduced={reduced}
        intro={intro}
      />
    </div>
  );
}
