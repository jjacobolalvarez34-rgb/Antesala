import { create } from 'zustand';

import type { Quality } from './capabilities';

/**
 * Estado del recorrido. La URL es la fuente de verdad de la selección
 * (nivel, unidad, espacio); aquí solo vive lo que no cabe en la URL.
 */
export type Consent = 'granted' | 'declined' | null;

const CONSENT_KEY = 'antesala:3d';

interface TourState {
  /** null mientras no se ha detectado */
  quality: Quality | null;
  /** true si la calidad viene forzada por ?calidad= (no se ajusta sola) */
  qualityLocked: boolean;
  /** el equipo parece justo: hay que preguntar antes de cargar el 3D */
  askConsent: boolean;
  consent: Consent;
  /** la escena pintó sus primeros frames */
  sceneReady: boolean;
  /** piso resaltado por hover (sincroniza 3D y LevelPicker) */
  hoveredLevelId: string | null;
  /** fachada que mira la cámara en la vista exterior (índice de borde del footprint) */
  facade: number;
  /** la escena se montó alguna vez (no se desmonta: Canvas persistente) */
  sceneMounted: boolean;
  /** la escena se montó entrando por /explorar → vuelo de entrada */
  intro: boolean;
  init: (quality: Quality, opts: { locked: boolean; ask: boolean }) => void;
  setQuality: (q: Quality) => void;
  setConsent: (c: Exclude<Consent, null>) => void;
  setSceneReady: (ready: boolean) => void;
  setHoveredLevel: (id: string | null) => void;
  setFacade: (i: number) => void;
  mountScene: (intro: boolean) => void;
}

export const useTour = create<TourState>((set) => ({
  quality: null,
  qualityLocked: false,
  askConsent: false,
  consent: null,
  sceneReady: false,
  hoveredLevelId: null,
  facade: 0,
  sceneMounted: false,
  intro: false,
  init: (quality, { locked, ask }) => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(CONSENT_KEY) : null;
    set({
      quality,
      qualityLocked: locked,
      askConsent: ask && !locked,
      consent: stored === 'granted' || stored === 'declined' ? stored : null,
    });
  },
  setQuality: (quality) => set({ quality }),
  setConsent: (consent) => {
    sessionStorage.setItem(CONSENT_KEY, consent);
    set({ consent });
  },
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setHoveredLevel: (hoveredLevelId) => set({ hoveredLevelId }),
  setFacade: (facade) => set({ facade }),
  mountScene: (intro) => set((s) => (s.sceneMounted ? s : { sceneMounted: true, intro })),
}));

/** ¿Se puede mostrar el 3D con lo que sabemos ahora? */
export const can3d = (s: Pick<TourState, 'quality' | 'askConsent' | 'consent'>) =>
  s.quality !== null && s.quality !== 'lista' && s.consent !== 'declined' && (!s.askConsent || s.consent === 'granted');
