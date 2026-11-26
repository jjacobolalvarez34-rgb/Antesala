'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { useReducedMotion } from '@/components/motion/useReducedMotion';
import { detectCapability, qualityOverride } from '@/lib/capabilities';
import { prefetch } from './prefetch';
import { useLang } from '@/components/i18n/Lang';
import { routesFor } from '@/lib/i18n';
import type { routes } from '@/lib/routes';
import { can3d, useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

import type { SceneData, SceneDataWire, SceneStage } from './Scene';
import type { TerrainData, TerrainDataWire } from './terrain/types';

/** El JS de three.js se descarga solo cuando hace falta (ARQUITECTURA.md §6). */
const loadScene = () => import('./Scene');
const Scene = dynamic(loadScene, { ssr: false });
/** terrenos (glamping, D-083): su propia escena, también bajo demanda */
const loadTerrain = () => import('./terrain/TerrainScene');
const TerrainScene = dynamic(loadTerrain, { ssr: false });

/**
 * Capa persistente del layout: decide la calidad, monta la escena la primera
 * vez que una etapa la necesita y ya no la desmonta (Canvas persistente).
 * Marca <html data-scene="on"> cuando la escena está visible y lista; las
 * páginas usan la variante `scene:` para pasar de lista a paneles sobre el 3D.
 */
export function SceneLayer({ data: wire }: { data: SceneDataWire | TerrainDataWire }) {
  const data = useMemo<SceneData | TerrainData>(() => {
    const { unitPlanTypes, unitPlanOf, ...rest } = wire;
    const unitPlans: SceneData['unitPlans'] = {};
    for (const [unit, key] of Object.entries(unitPlanOf)) {
      const t = unitPlanTypes[key];
      if (t) unitPlans[unit] = t;
    }
    return { ...rest, unitPlans } as SceneData | TerrainData;
  }, [wire]);
  const terrain = 'kind' in data && data.kind === 'terreno';
  const router = useRouter();
  const lang = useLang();
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

  // precarga (D-029): desde cualquier etapa, el JS del 3D y lo del día.
  // Escritorio: en tiempo ocioso. Táctil (D-051): por intención, con el primer toque o
  // desplazamiento; evaluar three.js en ocio bloqueaba el hilo de un celular lento ~1 s
  useEffect(() => {
    // en la vista guiada (D-095) no hay 3D: que no le quite red ni procesador al video
    if (!allowed || sceneMounted || stageName === 'guiada') return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      (terrain ? loadTerrain() : loadScene()).catch(() => {});
      prefetch('dia');
    };
    if (window.matchMedia('(pointer: coarse)').matches && stageName !== 'explorar') {
      const opts = { once: true, passive: true } as const;
      window.addEventListener('pointerdown', run, opts);
      window.addEventListener('scroll', run, opts);
      return () => {
        window.removeEventListener('pointerdown', run);
        window.removeEventListener('scroll', run);
      };
    }
    // Safari no tiene requestIdleCallback
    const idle = 'requestIdleCallback' in window;
    const id = idle ? window.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [allowed, sceneMounted, stageName, terrain]);

  useEffect(() => {
    // la primera carga siempre entra volando (también si se llega directo a un piso o una
    // habitación desde la lista: antes la cámara aparecía de golpe tras el telón)
    if (wants3d) mountScene(true);
  }, [wants3d, mountScene]);

  // Sin WebGL2, o si la persona eligió la lista: la vista exterior pasa a la lista
  useEffect(() => {
    if (stageName === 'explorar' && (quality === 'lista' || consent === 'declined')) {
      router.replace(`${routesFor(lang).lista(data.slug)}?aviso=sin-3d` as ReturnType<typeof routes.lista>);
    }
  }, [stageName, quality, consent, router, data.slug, lang]);

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
      {terrain ? (
        <TerrainScene
          data={data as TerrainData}
          stage={stage ?? { kind: 'explorar' }}
          active={wants3d}
          quality={quality}
          reduced={reduced}
          intro={intro}
        />
      ) : (
        <Scene
          data={data as SceneData}
          stage={stage ?? { kind: 'explorar' }}
          active={wants3d}
          quality={quality}
          qualityLocked={qualityLocked}
          reduced={reduced}
          intro={intro}
        />
      )}
    </div>
  );
}
