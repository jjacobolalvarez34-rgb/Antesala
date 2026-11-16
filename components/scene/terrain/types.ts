import type { Route } from 'next';

import type { Offer, PlanGeometry } from '@/lib/types';

import type { ScenePoi } from '../Pois';
import type { UnitSpaceMeta } from '../UnitModel';

/** Un refugio suelto en el terreno (glamping, D-083). Coordenadas en metros, origen en el centro del mapa. */
export interface TerrainCabin {
  id: string;
  name: string;
  category?: string;
  href: Route;
  price?: number;
  occupied: boolean;
  view?: string;
  capacity: number;
  x: number;
  z: number;
  style: 'madera' | 'vidrio' | 'piedra' | 'clara';
  roof: 'dos-aguas' | 'plano';
}

export interface TerrainData {
  kind: 'terreno';
  slug: string;
  brandName: string;
  offer?: Offer;
  colors: { accent: string };
  liveInterior: boolean;
  /** tamaño del mapa del terreno en metros (ancho x, fondo z) */
  mapSize: [number, number];
  pois: ScenePoi[];
  cabins: TerrainCabin[];
  unitPlans: Record<string, { plan: PlanGeometry; spaces: UnitSpaceMeta[]; realista?: string }>;
}

export type TerrainDataWire = Omit<TerrainData, 'unitPlans'> & {
  unitPlanTypes: Record<string, { plan: PlanGeometry; spaces: UnitSpaceMeta[]; realista?: string }>;
  unitPlanOf: Record<string, string>;
};
