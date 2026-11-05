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
  /** hora del día de la escena */
  night: boolean;
  /** unidad bajo el puntero en la fachada (id) y posición del puntero */
  hoveredUnit: { id: string; x: number; y: number } | null;
  /** unidad elegida en la fachada (id) */
  selectedUnit: string | null;
  /** vista desde la ventana de la unidad elegida (data URL) */
  view: { unitId: string; src: string } | null;
  /** en el detalle de un espacio: 360° (true) o maqueta (false) */
  view360: boolean;
  /** unidad de la que se pidió la vista desde la ventana (la renderiza la escena) */
  viewRequest: string | null;
  /** mirador activo (360° en vivo desde un punto de una zona común, p. ej. la terraza) */
  viewpoint: { poiId: string; index: number } | null;
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
  setNight: (night: boolean) => void;
  setHoveredUnit: (u: TourState['hoveredUnit']) => void;
  setSelectedUnit: (id: string | null) => void;
  setView: (v: TourState['view']) => void;
  setView360: (on: boolean) => void;
  requestView: (unitId: string | null) => void;
  setViewpoint: (v: TourState['viewpoint']) => void;
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
  night: false,
  hoveredUnit: null,
  selectedUnit: null,
  view: null,
  view360: true,
  viewRequest: null,
  viewpoint: null,
  sceneMounted: false,
  intro: false,
  init: (quality, { locked, ask }) => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(CONSENT_KEY) : null;
    // la escena arranca como se ve a la hora del dispositivo (Bogotá anochece ~6 p. m. todo el año)
    // ?hora=21 fuerza la hora (demos y capturas); si no, la del dispositivo
    const forced = Number(new URLSearchParams(window.location.search).get('hora'));
    const hour = Number.isFinite(forced) && forced >= 0 && forced < 24 && window.location.search.includes('hora=')
      ? forced
      : new Date().getHours();
    set({
      night: hour >= 18 || hour < 6,
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
  setFacade: (facade) => set({ facade, selectedUnit: null }),
  setNight: (night) => set({ night }),
  setHoveredUnit: (hoveredUnit) => set({ hoveredUnit }),
  setSelectedUnit: (selectedUnit) => set({ selectedUnit }),
  setView: (view) => set({ view }),
  setView360: (view360) => set({ view360 }),
  requestView: (viewRequest) => set({ viewRequest }),
  setViewpoint: (viewpoint) => set({ viewpoint }),
  mountScene: (intro) => set((s) => (s.sceneMounted ? s : { sceneMounted: true, intro })),
}));

/** ¿Se puede mostrar el 3D con lo que sabemos ahora? */
export const can3d = (s: Pick<TourState, 'quality' | 'askConsent' | 'consent'>) =>
  s.quality !== null && s.quality !== 'lista' && s.consent !== 'declined' && (!s.askConsent || s.consent === 'granted');
