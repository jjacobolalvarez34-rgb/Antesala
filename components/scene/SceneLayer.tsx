'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useEffect } from 'react';

import { useReducedMotion } from '@/components/motion/useReducedMotion';
import { detectCapability, qualityOverride } from '@/lib/capabilities';
import { prefetch } from './prefetch';
import { routes } from '@/lib/routes';
import { can3d, useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

import type { SceneData, SceneStage } from './Scene';

/** El JS de three.js se descarga solo cuando hace falta (ARQUITECTURA.md §6). */
const loadScene = () => import('./Scene');
const Scene = dynamic(loadScene, { ssr: false });

/**
 * Capa persistente del layout: decide la calidad, monta la escena la primera
 * vez que una etapa la necesita y ya no la desmonta (Canvas persistente).
 * Marca <html data-scene="on"> cuando la escena está visible y lista; las
 * páginas usan la variante `scene:` para pasar de lista a paneles sobre el 3D.
 */
export function SceneLayer({ data }: { data: SceneData }) {
  const router = useRouter();
  const [stageName, param, spaceParam] = useSelectedLayoutSegments();
  const reduced = useReducedMotion();
  const { quality, qualityLocked, askConsent, consent, sceneReady, sceneMounted, intro, init, mountScene } = useTour();

  const stage: SceneStage | null =
    stageName === 'explorar'
      ? { kind: 'explorar' }
      : stageName === 'piso' && param
        ? { kind: 'piso', levelId: param }
        : stageName === 'unidad' && param && data.unitPlans[param]
          ? { kind: 'unidad', unitId: param, spaceId: spaceParam ?? null }
          : null;

  useEffect(() => {
    if (quality !== null) return;
    const forced = qualityOverride();
    const cap = forced ? { quality: forced, ask: false } : detectCapability();
    init(cap.quality, { locked: forced !== null, ask: cap.ask });
  }, [quality, init]);

  const allowed = can3d({ quality, askConsent, consent });
  const wants3d = stage !== null && allowed;

  // precarga (D-029): desde cualquier etapa, en tiempo ocioso, el JS del 3D y lo del día
  useEffect(() => {
    if (!allowed || sceneMounted) return;
    const run = () => {
      loadScene().catch(() => {});
      prefetch('dia');
    };
    // Safari no tiene requestIdleCallback
    const idle = 'requestIdleCallback' in window;
    const id = idle ? window.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [allowed, sceneMounted]);

  useEffect(() => {
    if (wants3d) mountScene(stage?.kind === 'explorar');
  }, [wants3d, stage?.kind, mountScene]);

  // Sin WebGL2, o si la persona eligió la lista: la vista exterior pasa a la lista
  useEffect(() => {
    if (stageName === 'explorar' && (quality === 'lista' || consent === 'declined')) {
      router.replace(`${routes.lista(data.slug)}?aviso=sin-3d` as ReturnType<typeof routes.lista>);
    }
  }, [stageName, quality, consent, router, data.slug]);

  const active = wants3d && sceneReady;
  useEffect(() => {
    document.documentElement.dataset.scene = active ? 'on' : 'off';
  }, [active]);

  if (!sceneMounted || !allowed || quality === null || quality === 'lista') return null;

  return (
    <div
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
