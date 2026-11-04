import { create } from 'zustand';

import type { Quality } from './capabilities';

/**
 * Estado del recorrido. La URL es la fuente de verdad de la selección
 * (nivel, unidad, espacio); aquí solo vive lo que no cabe en la URL.
 */
interface TourState {
  /** null mientras no se ha detectado */
  quality: Quality | null;
  /** true si la calidad viene forzada por ?calidad= (no se degrada sola) */
  qualityLocked: boolean;
  /** la escena pintó su primer frame */
  sceneReady: boolean;
  /** piso resaltado por hover (sincroniza 3D y LevelPicker) */
  hoveredLevelId: string | null;
  /** la escena se montó alguna vez (no se desmonta: Canvas persistente) */
  sceneMounted: boolean;
  /** la escena se montó entrando por /explorar → animación de entrada */
  intro: boolean;
  mountScene: (intro: boolean) => void;
  setQuality: (q: Quality, locked?: boolean) => void;
  setSceneReady: (ready: boolean) => void;
  setHoveredLevel: (id: string | null) => void;
}

export const useTour = create<TourState>((set) => ({
  quality: null,
  qualityLocked: false,
  sceneReady: false,
  hoveredLevelId: null,
  sceneMounted: false,
  intro: false,
  mountScene: (intro) => set((s) => (s.sceneMounted ? s : { sceneMounted: true, intro })),
  setQuality: (quality, locked) => set((s) => ({ quality, qualityLocked: locked ?? s.qualityLocked })),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setHoveredLevel: (hoveredLevelId) => set({ hoveredLevelId }),
}));
