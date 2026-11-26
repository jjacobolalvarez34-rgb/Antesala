/** Tipos de la vista guiada (D-095), comunes al servidor, al pipeline y al visor. */

/** punto en la imagen, de 0 a 1 (y hacia abajo) */
export type P2 = [number, number];

export interface GuidedOrient {
  w: number;
  h: number;
  /** video de la llegada (ruta absoluta en public/ o URL) */
  video?: string;
  /** la torre de frente, con lente largo */
  pisos?: string;
  /** contorno de cada piso en la imagen de los pisos */
  floors?: Record<string, P2[]>;
  /** de noche: la misma toma (los mismos contornos), otra luz */
  night?: { video?: string; pisos?: string };
  /** un piso por imagen, solo la planta sobre fondo liso, con el contorno de cada espacio */
  levels?: Record<
    string,
    {
      img: string;
      night?: string;
      /** tamaño de la toma de la planta (si falta, el de la orientación) */ w?: number;
      h?: number;
      spaces: { id: string; kind: 'unit' | 'poi'; poly: P2[] }[];
    }
  >;
}

export interface GuidedManifest {
  version: 1;
  /** color del fondo liso de las plantas (el mismo de la imagen) */
  background?: string;
  /** color del cielo arriba de la torre (para rellenar si la imagen no cubre la pantalla) */
  sky?: string;
  /** lo mismo, de noche */
  backgroundNight?: string;
  skyNight?: string;
  orients: Partial<Record<'h' | 'v', GuidedOrient>>;
}

/** Lo que recibe el visor (components/guided/GuidedView.tsx), ya con URLs y textos. */
export interface GuidedSpace {
  id: string;
  name: string;
  areaM2?: number;
  outdoor: boolean;
  photos: {
    id: string;
    url: string;
    alt: string;
    fidelity: import('./types').Fidelity;
    width?: number;
    height?: number;
    tier?: 'premium';
  }[];
  pano?: { url: string; yaw?: number };
}

export interface GuidedUnit {
  id: string;
  name: string;
  category?: string;
  levelId: string;
  price?: number;
  occupied: boolean;
  capacity: number;
  beds?: string;
  areaM2: number;
  view?: string;
  /** clave del plano (las unidades tipo lo comparten) */
  plan?: string;
}

export interface GuidedLevel {
  id: string;
  name: string;
  order: number;
  units: string[];
  pois: { id: string; name: string; description?: string }[];
}

export interface GuidedData {
  slug: string;
  /** la marca del hotel, abajo a la izquierda */
  name: string;
  place: string;
  upper: boolean;
  /** el aviso de la demo ("Hotel ficticio · imágenes ilustrativas"): no se esconde (regla 7) */
  note: string;
  background: string;
  sky: string;
  backgroundNight: string;
  skyNight: string;
  orients: GuidedManifest['orients'];
  /** de arriba hacia abajo */
  levels: GuidedLevel[];
  units: Record<string, GuidedUnit>;
  /** geometría del plano y espacios (con fotos y 360°) por clave de plano */
  plans: Record<string, { geometry: import('./types').PlanGeometry; spaces: GuidedSpace[] }>;
}
