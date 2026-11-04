import type { Building } from './types';

/**
 * Geometría pura del edificio procedural (CONTENIDO.md §5) y poses de cámara.
 * Coordenadas: footprint en metros sobre el plano XZ (x, z); Y hacia arriba.
 */

export interface BuildingFrame {
  center: [number, number];
  width: number;
  depth: number;
  height: number;
  floorHeight: number;
  floors: number;
  /** radio que envuelve el edificio (para encuadrar) */
  radius: number;
}

export function buildingFrame(b: Building): BuildingFrame {
  const xs = b.footprint.map((p) => p[0]);
  const zs = b.footprint.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const height = b.floors * b.floorHeightM;
  return {
    center: [(minX + maxX) / 2, (minZ + maxZ) / 2],
    width,
    depth,
    height,
    floorHeight: b.floorHeightM,
    floors: b.floors,
    radius: Math.hypot(width, depth, height) / 2,
  };
}

/** Altura de la losa inferior del piso (order empieza en 1). */
export const floorBaseY = (frame: BuildingFrame, order: number) => (order - 1) * frame.floorHeight;

export interface CameraPose {
  target: [number, number, number];
  /** coordenadas esféricas alrededor del target */
  radius: number;
  /** ángulo desde el eje Y (0 = cenital) */
  polar: number;
  /** ángulo alrededor de Y (0 = frente, +z) */
  azimuth: number;
  /** desplazamiento de la vista para dejar espacio a los paneles (fracción del lienzo) */
  shiftX: number;
  shiftY: number;
}

const DEG = Math.PI / 180;

/** Distancia para que una esfera de radio r quepa en el FOV vertical, con margen. */
function fitDistance(r: number, fovDeg: number, aspect: number, margin = 1.15) {
  const vFov = fovDeg * DEG;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  return (r * margin) / Math.sin(Math.min(vFov, hFov) / 2);
}

export function explorePose(f: BuildingFrame, fov: number, aspect: number, panelSide: boolean): CameraPose {
  return {
    target: [f.center[0], f.height * 0.46, f.center[1]],
    radius: fitDistance(f.radius, fov, aspect, aspect < 1 ? 1.25 : 1.45),
    polar: 63 * DEG,
    azimuth: 32 * DEG,
    // escritorio: deja sitio al selector de pisos (derecha); móvil: baja el edificio
    // bajo la tarjeta del título y lo aparta del selector
    shiftX: panelSide ? 0.08 : 0.04,
    shiftY: aspect < 1 ? -0.05 : 0,
  };
}

/** Pose de entrada: casi cenital y lejos; la cámara baja en arco hasta explorePose. */
export function introPose(explore: CameraPose): CameraPose {
  return { ...explore, radius: explore.radius * 1.9, polar: 8 * DEG, azimuth: explore.azimuth - 70 * DEG };
}

/** Separación del piso elegido hacia el frente (+z), en metros. */
export const FLOOR_PULL = 3.2;

export function floorPose(
  f: BuildingFrame,
  order: number,
  fov: number,
  aspect: number,
  layout: 'sheet' | 'side',
): CameraPose {
  const y = floorBaseY(f, order) + f.floorHeight * 0.5;
  const floorRadius = Math.hypot(f.width, f.depth) / 2;
  return {
    target: [f.center[0], y, f.center[1] + FLOOR_PULL * 0.6],
    radius: fitDistance(floorRadius, fov, aspect, aspect < 1 ? 1.4 : 1.45),
    polar: 58 * DEG,
    azimuth: 22 * DEG,
    shiftX: layout === 'side' ? 0.16 : 0,
    // en móvil el panel ocupa la parte baja: subimos el piso en la imagen
    shiftY: layout === 'sheet' ? 0.17 : 0,
  };
}
