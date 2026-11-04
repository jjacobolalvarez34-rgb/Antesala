/**
 * Modelo de datos del visor. Fuente: docs/ARQUITECTURA.md §4.
 * Este esquema será el de Supabase en la Fase 1; cualquier cambio se refleja en el doc.
 */

export type MediaKind = 'photo' | 'pano360' | 'splat' | 'video' | 'glb';

export type Fidelity = 'exacta' | 'ilustrativa';

export interface PanoHotspot {
  id: string;
  yaw: number;
  pitch: number;
  label: string;
  /** id de espacio destino */
  target?: string;
}

export interface Media {
  id: string;
  kind: MediaKind;
  /** ruta relativa a la carpeta del hotel; lib/media.ts la resuelve */
  src: string;
  /** versión liviana o miniatura */
  preview?: string;
  alt: string;
  fidelity: Fidelity;
  /** ISO 8601 */
  capturedAt?: string;
  width?: number;
  height?: number;
  /** solo pano360 */
  hotspots?: PanoHotspot[];
}

export type SpaceType =
  | 'dormitorio'
  | 'bano'
  | 'sala'
  | 'cocina'
  | 'comedor'
  | 'balcon'
  | 'terraza'
  | 'estudio'
  | 'vestier'
  | 'otro';

export interface Space {
  /** = id del polígono en el SVG del plano */
  id: string;
  name: string;
  type: SpaceType;
  areaM2?: number;
  /** texto corto para la ficha del espacio */
  description?: string;
  features: string[];
  media: Media[];
}

export interface Unit {
  /** "502" */
  id: string;
  /** "Suite 502" */
  name: string;
  categoryId: string;
  levelId: string;
  capacity: number;
  beds: string;
  areaM2: number;
  /** simulado en la demo */
  basePriceCOP?: number;
  /** extra por vista o piso alto */
  viewPremiumCOP?: number;
  /** qué se ve desde la unidad; justifica el extra por vista */
  view?: string;
  /** "plans/suite-502.svg" */
  plan: string;
  spaces: Space[];
  featured?: boolean;
}

export interface Category {
  id: string;
  name: string;
  tagline: string;
  highlights: string[];
}

export interface Level {
  id: string;
  name: string;
  kind: 'piso' | 'zona';
  order: number;
}

export interface Poi {
  id: string;
  name: string;
  /** nivel donde está la zona común (para el modo lista) */
  levelId?: string;
  description?: string;
  position: [number, number, number];
  media: Media[];
}

export interface Building {
  /** polígono en metros */
  footprint: [number, number][];
  floors: number;
  floorHeightM: number;
}

export interface Site {
  kind: 'edificio' | 'terreno';
  building?: Building;
  /** glb | splat | foto aérea; si está vacío se usa el procedural */
  exterior: Media[];
  pois: Poi[];
}

export interface Hotel {
  slug: string;
  name: string;
  city: string;
  /** barrio o zona, opcional */
  neighborhood?: string;
  /** párrafo corto de presentación para la entrada y el modo lista */
  intro?: string;
  locale: 'es' | 'en';
  contact: { whatsapp: string; bookingUrl?: string };
  site: Site;
  levels: Level[];
  categories: Category[];
  units: Unit[];
  /** true → banner "Hotel ficticio · imágenes ilustrativas" */
  isDemo: boolean;
}

/** Tokens visuales por hotel: content/hotels/<slug>/tokens.json */
export interface HotelTokens {
  brand: { name: string; logo?: string; tagline: string };
  color: {
    /** acento sobre superficies claras (AA con texto blanco encima) */
    accent: string;
    /** variante del acento para superficies oscuras (escena 3D) */
    accentOnDark?: string;
    base: string;
    stone?: string;
    ink: string;
  };
  font: { display: DisplayFont; text: TextFont };
  voice: string;
}

/** Fuentes registradas en lib/fonts.ts. Para sumar una, se registra allí y aquí. */
export type DisplayFont = 'Instrument Serif';
export type TextFont = 'Inter';

/** Geometría de un plano SVG ya parseado (centímetros). */
export interface PlanRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlanOpening extends PlanRect {
  type: 'door' | 'window';
}

export interface PlanFurniture extends PlanRect {
  item: string;
}

export interface PlanSpace {
  id: string;
  /** puntos [x, y] en cm */
  points: [number, number][];
}

export interface PlanGeometry {
  width: number;
  height: number;
  walls: PlanRect[];
  spaces: PlanSpace[];
  openings: PlanOpening[];
  furniture: PlanFurniture[];
}
